import dayjs from 'dayjs'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'
import { ethers, BigNumber } from 'ethers'
import {
  L2ToL1EventResultPlus,
  Transaction,
  OutgoingMessageState,
  getUniqueIdOrHashFromEvent,
  NodeBlockDeadlineStatusTypes
} from 'token-bridge-sdk'
import { DepositStatus, MergedTransaction } from './state'

export const TX_DATE_FORMAT = 'MMM DD, YYYY'
export const TX_TIME_FORMAT = 'hh:mm A'

export const outgoungStateToString = {
  [OutgoingMessageState.UNCONFIRMED]: 'Unconfirmed',
  [OutgoingMessageState.CONFIRMED]: 'Confirmed',
  [OutgoingMessageState.EXECUTED]: 'Executed'
}

export const getDepositStatus = (tx: Transaction) => {
  if (tx.type !== 'deposit' && tx.type !== 'deposit-l1') return undefined
  if (tx.status === 'failure') {
    return DepositStatus.L1_FAILURE
  }
  if (tx.status === 'pending') {
    return DepositStatus.L1_PENDING
  }

  // l1 succeeded...
  const { l1ToL2MsgData } = tx
  if (!l1ToL2MsgData) {
    return DepositStatus.L2_PENDING
  }
  switch (l1ToL2MsgData.status) {
    case L1ToL2MessageStatus.NOT_YET_CREATED:
      return DepositStatus.L2_PENDING
    case L1ToL2MessageStatus.CREATION_FAILED:
      return DepositStatus.CREATION_FAILED
    case L1ToL2MessageStatus.EXPIRED:
      return tx.assetType === 'ETH'
        ? DepositStatus.L2_SUCCESS
        : DepositStatus.EXPIRED
    case L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2: {
      return tx.assetType === 'ETH'
        ? DepositStatus.L2_SUCCESS
        : DepositStatus.L2_FAILURE
    }
    case L1ToL2MessageStatus.REDEEMED:
      return DepositStatus.L2_SUCCESS
  }
}

export const transformDeposits = (
  deposits: Transaction[]
): MergedTransaction[] => {
  return deposits.map(tx => {
    return {
      direction: tx.type,
      status: tx.status,
      createdAt: tx.timestampCreated
        ? getStandardizedTimestamp(tx.timestampCreated)
        : null,
      resolvedAt: tx.timestampResolved
        ? getStandardizedTimestamp(tx.timestampResolved)
        : null,
      txId: tx.txID,
      asset: tx.assetName?.toLowerCase() || '',
      value: tx.value,
      uniqueId: null, // not needed
      isWithdrawal: false,
      blockNum: tx.blockNumber || null,
      tokenAddress: tx.tokenAddress || null,
      l1ToL2MsgData: tx.l1ToL2MsgData,
      l2ToL1MsgData: tx.l2ToL1MsgData,
      depositStatus: getDepositStatus(tx)
    }
  })
}

export const transformWithdrawals = (
  withdrawals: L2ToL1EventResultPlus[]
): MergedTransaction[] => {
  return withdrawals.map(tx => {
    const uniqueIdOrHash = getUniqueIdOrHashFromEvent(tx)

    return {
      direction: 'outbox',
      status:
        tx.nodeBlockDeadline ===
        NodeBlockDeadlineStatusTypes.EXECUTE_CALL_EXCEPTION
          ? 'Failure'
          : outgoungStateToString[tx.outgoingMessageState],
      createdAt: getStandardizedTimestamp(
        String(BigNumber.from(tx.timestamp).toNumber() * 1000)
      ),
      resolvedAt: null,
      txId: tx.l2TxHash || 'l2-tx-hash-not-found',
      asset: tx.symbol?.toLocaleLowerCase() || '',
      value: ethers.utils.formatUnits(tx.value?.toString(), tx.decimals),
      uniqueId: uniqueIdOrHash,
      isWithdrawal: true,
      blockNum: tx.ethBlockNum.toNumber(),
      tokenAddress: tx.tokenAddress || null,
      nodeBlockDeadline: tx.nodeBlockDeadline
    }
  })
}

// filter the transactions based on current wallet address and network ID's
export const filterTransactions = (
  transactions: Transaction[],
  walletAddress: string,
  l1ChainId: number | null,
  l2ChainId: number | null
): Transaction[] => {
  const result = []
  for (const tx of transactions) {
    const txSender = tx.sender
    const txL1NetworkID = tx.l1NetworkID
    const txL2NetworkID = tx.l2NetworkID

    const isSenderWallet = txSender === walletAddress
    const matchesL1 = txL1NetworkID === String(l1ChainId)

    // The `l2NetworkID` field was added later, so not all transactions will have it
    const matchesL2 =
      typeof txL2NetworkID === 'undefined'
        ? matchesL1
        : txL2NetworkID === String(l2ChainId)

    if (isSenderWallet && matchesL1 && matchesL2) {
      result.push(tx)
    }
  }

  return result
}

export const isDeposit = (tx: MergedTransaction) => {
  return tx.direction === 'deposit' || tx.direction === 'deposit-l1'
}

export const isWithdrawal = (tx: MergedTransaction) => {
  return tx.direction === 'withdraw' || tx.direction === 'outbox'
}

export const isPending = (tx: MergedTransaction) => {
  return (
    (isDeposit(tx) &&
      (tx.status === 'pending' ||
        tx.depositStatus === DepositStatus.L1_PENDING ||
        tx.depositStatus === DepositStatus.L2_PENDING)) ||
    (isWithdrawal(tx) &&
      (tx.status === outgoungStateToString[OutgoingMessageState.UNCONFIRMED] ||
        tx.status === outgoungStateToString[OutgoingMessageState.CONFIRMED]))
  )
}

export const isFailed = (tx: MergedTransaction) => {
  return (
    (isDeposit(tx) &&
      (tx.status === 'failure' ||
        tx.depositStatus == DepositStatus.L1_FAILURE ||
        tx.depositStatus === DepositStatus.L2_FAILURE)) ||
    (isWithdrawal(tx) &&
      tx.nodeBlockDeadline ==
        NodeBlockDeadlineStatusTypes.EXECUTE_CALL_EXCEPTION)
  )
}

export const getStandardizedTimestamp = (dateString: string) => {
  // because we get timestamps in different formats from subgraph/event-logs/useTxn hook, we need 1 standard format.

  if (isNaN(Number(dateString))) return dayjs(new Date(dateString)).format() // for ISOstring type of dates -> dayjs timestamp
  return dayjs(Number(dateString)).format() // for timestamp type of date -> dayjs timestamp
}

export const getStandardizedTime = (standatdisedTimestamp: string) => {
  return dayjs(standatdisedTimestamp).format(TX_TIME_FORMAT) // dayjs timestamp -> time
}

export const getStandardizedDate = (standatdisedTimestamp: string) => {
  return dayjs(standatdisedTimestamp).format(TX_DATE_FORMAT) // dayjs timestamp -> date
}

export const findMatchingL1TxForWithdrawal = (
  withdrawalTxn: MergedTransaction
) => {
  // finds the corresponding L1 transaction for withdrawal

  const cachedTransactions: Transaction[] = JSON.parse(
    window.localStorage.getItem('arbTransactions') || '[]'
  )
  const outboxTransactions = transformDeposits(
    cachedTransactions.filter(tx => tx.type === 'outbox')
  )

  return outboxTransactions.find(_tx => {
    const l2ToL1MsgData = _tx.l2ToL1MsgData

    if (!(l2ToL1MsgData?.uniqueId && withdrawalTxn?.uniqueId)) {
      return false
    }

    // To get rid of Proxy
    const txUniqueId = BigNumber.from(withdrawalTxn.uniqueId)
    const _txUniqueId = BigNumber.from(l2ToL1MsgData.uniqueId)

    return txUniqueId.eq(_txUniqueId)
  })
}
