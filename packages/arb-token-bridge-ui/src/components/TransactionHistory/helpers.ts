import dayjs from 'dayjs'
import {
  StaticJsonRpcProvider,
  TransactionReceipt
} from '@ethersproject/providers'
import { EthDepositStatus, L1ToL2MessageStatus } from '@arbitrum/sdk'
import {
  EthDepositMessage,
  L1ToL2MessageReader
} from '@arbitrum/sdk/dist/lib/message/L1ToL2Message'

import {
  DepositStatus,
  MergedTransaction,
  WithdrawalStatus
} from '../../state/app/state'
import { ChainId, getBlockTime, isNetwork, rpcURLs } from '../../util/networks'
import { Deposit, isCctpTransfer } from '../../hooks/useTransactionHistory'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { getL1ToL2MessageDataFromL1TxHash } from '../../util/deposits/helpers'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { getDepositStatus } from '../../state/app/utils'
import { getBlockBeforeConfirmation } from '../../state/cctpState'
import { getAttestationHashAndMessageFromReceipt } from '../../util/cctp/getAttestationHashAndMessageFromReceipt'

const PARENT_CHAIN_TX_DETAILS_OF_CLAIM_TX =
  'arbitrum:bridge:claim:parent:tx:details'
const DEPOSITS_LOCAL_STORAGE_KEY = 'arbitrum:bridge:deposits'

export enum StatusLabel {
  PENDING = 'Pending',
  CLAIMABLE = 'Claimable',
  SUCCESS = 'Success',
  EXPIRED = 'Expired',
  FAILURE = 'Failure'
}

function isDeposit(tx: MergedTransaction) {
  return !tx.isWithdrawal
}

export function isTxCompleted(tx: MergedTransaction) {
  if (isDeposit(tx)) {
    return tx.depositStatus === DepositStatus.L2_SUCCESS
  }
  return tx.status === WithdrawalStatus.EXECUTED
}

export function isTxPending(tx: MergedTransaction) {
  if (tx.isCctp && tx.status === 'pending') {
    return true
  }
  if (isDeposit(tx)) {
    return (
      tx.depositStatus === DepositStatus.L1_PENDING ||
      tx.depositStatus === DepositStatus.L2_PENDING
    )
  }
  return tx.status === WithdrawalStatus.UNCONFIRMED
}

export function isTxClaimable(tx: MergedTransaction) {
  if (isCctpTransfer(tx) && tx.status === 'Confirmed') {
    return true
  }
  if (isDeposit(tx)) {
    return false
  }
  return tx.status === WithdrawalStatus.CONFIRMED
}

export function isTxExpired(tx: MergedTransaction) {
  if (isDeposit(tx)) {
    return tx.depositStatus === DepositStatus.EXPIRED
  }
  return tx.status === WithdrawalStatus.EXPIRED
}

export function isTxFailed(tx: MergedTransaction) {
  if (isDeposit(tx)) {
    if (!tx.depositStatus) {
      return false
    }
    return [
      DepositStatus.CREATION_FAILED,
      DepositStatus.L1_FAILURE,
      DepositStatus.L2_FAILURE
    ].includes(tx.depositStatus)
  }
  return tx.status === WithdrawalStatus.FAILURE
}

export function getSourceChainId(tx: MergedTransaction) {
  return isDeposit(tx) ? tx.parentChainId : tx.childChainId
}

export function getDestChainId(tx: MergedTransaction) {
  return isDeposit(tx) ? tx.childChainId : tx.parentChainId
}

export function getProvider(chainId: ChainId) {
  const rpcUrl =
    rpcURLs[chainId] ?? getWagmiChain(chainId).rpcUrls.default.http[0]
  return new StaticJsonRpcProvider(rpcUrl)
}

export function isSameTransaction(
  txDetails_1: {
    txId: string
    parentChainId: ChainId
    childChainId: ChainId
  },
  txDetails_2: {
    txId: string
    parentChainId: ChainId
    childChainId: ChainId
  }
) {
  return (
    txDetails_1.txId === txDetails_2.txId &&
    txDetails_1.parentChainId === txDetails_2.parentChainId &&
    txDetails_1.childChainId === txDetails_2.childChainId
  )
}

export function getTxReceipt(tx: MergedTransaction) {
  const parentChainProvider = getProvider(tx.parentChainId)
  const childChainProvider = getProvider(tx.childChainId)

  const provider = tx.isWithdrawal ? childChainProvider : parentChainProvider

  return provider.getTransactionReceipt(tx.txId)
}

function getWithdrawalStatusFromReceipt(
  receipt: TransactionReceipt
): WithdrawalStatus | undefined {
  switch (receipt.status) {
    case 0:
      return WithdrawalStatus.FAILURE
    case 1:
      return WithdrawalStatus.UNCONFIRMED
    default:
      return undefined
  }
}

export function getDepositsWithoutStatusesFromCache(): Deposit[] {
  return JSON.parse(
    localStorage.getItem(DEPOSITS_LOCAL_STORAGE_KEY) ?? '[]'
  ) as Deposit[]
}

/**
 * Cache deposits from event logs. We don't fetch these so we need to store them locally.
 *
 * @param {MergedTransaction} tx - Deposit from event logs to be cached.
 */
export function addDepositToCache(tx: Deposit) {
  if (tx.direction !== 'deposit') {
    return
  }

  const cachedDeposits = getDepositsWithoutStatusesFromCache()

  const foundInCache = cachedDeposits.find(cachedTx =>
    isSameTransaction(
      { ...cachedTx, txId: cachedTx.txID },
      { ...tx, txId: tx.txID }
    )
  )

  if (foundInCache) {
    return
  }

  const newCachedDeposits = [tx, ...cachedDeposits]

  localStorage.setItem(
    DEPOSITS_LOCAL_STORAGE_KEY,
    JSON.stringify(newCachedDeposits)
  )
}

/**
 * Cache parent chain tx details when claiming. This is the chain the funds were claimed on. We store locally because we don't have access to this tx from the child chain tx data.
 *
 * @param {MergedTransaction} tx - Transaction that initiated the withdrawal (child chain transaction).
 * @param {string} parentChainTxId - Transaction ID of the claim transaction (parent chain transaction ID).
 */
export function setParentChainTxDetailsOfWithdrawalClaimTx(
  tx: MergedTransaction,
  parentChainTxId: string
) {
  const key = `${tx.parentChainId}-${tx.childChainId}-${tx.txId}`

  const cachedClaimParentChainTxId = JSON.parse(
    localStorage.getItem(PARENT_CHAIN_TX_DETAILS_OF_CLAIM_TX) ?? '{}'
  )

  if (key in cachedClaimParentChainTxId) {
    // already set
    return
  }

  localStorage.setItem(
    PARENT_CHAIN_TX_DETAILS_OF_CLAIM_TX,
    JSON.stringify({
      ...cachedClaimParentChainTxId,
      [key]: {
        txId: parentChainTxId,
        timestamp: dayjs().valueOf()
      }
    })
  )
}

export function getWithdrawalClaimParentChainTxDetails(
  tx: MergedTransaction
): { txId: string; timestamp: number } | undefined {
  if (!tx.isWithdrawal || tx.isCctp) {
    return undefined
  }

  const key = `${tx.parentChainId}-${tx.childChainId}-${tx.txId}`

  const cachedClaimParentChainTxDetails = (
    JSON.parse(
      localStorage.getItem(PARENT_CHAIN_TX_DETAILS_OF_CLAIM_TX) ?? '{}'
    ) as {
      [key in string]: {
        txId: string
        timestamp: number
      }
    }
  )[key]

  return cachedClaimParentChainTxDetails
}

export async function getUpdatedEthDeposit(
  tx: MergedTransaction
): Promise<MergedTransaction> {
  if (
    !isTxPending(tx) ||
    tx.assetType !== AssetType.ETH ||
    tx.isWithdrawal ||
    tx.isCctp
  ) {
    return tx
  }

  const { l1ToL2Msg } = await getL1ToL2MessageDataFromL1TxHash({
    depositTxId: tx.txId,
    isEthDeposit: true,
    l1Provider: getProvider(tx.parentChainId),
    l2Provider: getProvider(tx.childChainId)
  })

  if (!l1ToL2Msg) {
    const receipt = await getTxReceipt(tx)

    if (!receipt || receipt.status !== 0) {
      // not failure
      return tx
    }

    // failure
    const newDeposit = { ...tx, status: 'failure' }
    return { ...newDeposit, depositStatus: getDepositStatus(newDeposit) }
  }

  const status = await l1ToL2Msg?.status()
  const isDeposited = status === EthDepositStatus.DEPOSITED

  const newDeposit: MergedTransaction = {
    ...tx,
    status: 'success',
    resolvedAt: isDeposited ? dayjs().valueOf() : null,
    l1ToL2MsgData: {
      fetchingUpdate: false,
      status: isDeposited
        ? L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2
        : L1ToL2MessageStatus.NOT_YET_CREATED,
      retryableCreationTxID: (l1ToL2Msg as EthDepositMessage).l2DepositTxHash,
      // Only show `l2TxID` after the deposit is confirmed
      l2TxID: isDeposited
        ? (l1ToL2Msg as EthDepositMessage).l2DepositTxHash
        : undefined
    }
  }

  return {
    ...newDeposit,
    depositStatus: getDepositStatus(newDeposit)
  }
}

export async function getUpdatedTokenDeposit(
  tx: MergedTransaction
): Promise<MergedTransaction> {
  if (
    !isTxPending(tx) ||
    tx.assetType !== AssetType.ERC20 ||
    tx.isWithdrawal ||
    tx.isCctp
  ) {
    return tx
  }

  const { l1ToL2Msg } = await getL1ToL2MessageDataFromL1TxHash({
    depositTxId: tx.txId,
    isEthDeposit: false,
    l1Provider: getProvider(tx.parentChainId),
    l2Provider: getProvider(tx.childChainId)
  })
  const _l1ToL2Msg = l1ToL2Msg as L1ToL2MessageReader

  if (!l1ToL2Msg) {
    const receipt = await getTxReceipt(tx)

    if (!receipt || receipt.status !== 0) {
      // not failure
      return tx
    }

    // failure
    const newDeposit = { ...tx, status: 'failure' }
    return { ...newDeposit, depositStatus: getDepositStatus(newDeposit) }
  }

  const res = await _l1ToL2Msg.getSuccessfulRedeem()

  const l2TxID = (() => {
    if (res.status === L1ToL2MessageStatus.REDEEMED) {
      return res.l2TxReceipt.transactionHash
    } else {
      return undefined
    }
  })()

  const newDeposit: MergedTransaction = {
    ...tx,
    status: [3, 4].includes(res.status) ? 'success' : tx.status,
    l1ToL2MsgData: {
      status: res.status,
      l2TxID,
      fetchingUpdate: false,
      retryableCreationTxID: _l1ToL2Msg.retryableCreationId
    }
  }

  return {
    ...newDeposit,
    depositStatus: getDepositStatus(newDeposit)
  }
}

export async function getUpdatedWithdrawal(
  tx: MergedTransaction
): Promise<MergedTransaction> {
  if (!isTxPending(tx) || !tx.isWithdrawal || tx.isCctp) {
    return tx
  }

  const receipt = await getTxReceipt(tx)

  if (receipt) {
    const newStatus = getWithdrawalStatusFromReceipt(receipt)

    if (typeof newStatus !== 'undefined') {
      return {
        ...tx,
        status: newStatus
      }
    }
  }

  return tx
}

export async function getUpdatedCctpTransfer(
  tx: MergedTransaction
): Promise<MergedTransaction> {
  if (!isTxPending(tx) || !tx.isCctp) {
    return tx
  }

  const receipt = await getTxReceipt(tx)
  const requiredL1BlocksBeforeConfirmation = getBlockBeforeConfirmation(
    tx.parentChainId
  )
  const blockTime = getBlockTime(tx.parentChainId)

  const txWithTxId: MergedTransaction = { ...tx, txId: receipt.transactionHash }

  if (receipt.status === 0) {
    return {
      ...txWithTxId,
      status: 'Failure'
    }
  }
  if (tx.cctpData?.receiveMessageTransactionHash) {
    return {
      ...txWithTxId,
      status: 'Executed'
    }
  }
  if (receipt.blockNumber && !tx.blockNum) {
    // If blockNumber was never set (for example, network switch just after the deposit)
    const { messageBytes, attestationHash } =
      getAttestationHashAndMessageFromReceipt(receipt)
    return {
      ...txWithTxId,
      blockNum: receipt.blockNumber,
      cctpData: {
        ...tx.cctpData,
        messageBytes,
        attestationHash
      }
    }
  }
  const isConfirmed =
    tx.createdAt &&
    dayjs().diff(tx.createdAt, 'second') >
      requiredL1BlocksBeforeConfirmation * blockTime
  if (
    // If transaction claim was set to failure, don't reset to Confirmed
    tx.status !== 'Failure' &&
    isConfirmed
  ) {
    return {
      ...txWithTxId,
      status: 'Confirmed'
    }
  }

  return tx
}

export function getTxStatusLabel(tx: MergedTransaction): StatusLabel {
  if (isDeposit(tx)) {
    switch (tx.depositStatus) {
      case DepositStatus.CREATION_FAILED:
      case DepositStatus.L1_FAILURE:
      case DepositStatus.L2_FAILURE:
        return StatusLabel.FAILURE
      case DepositStatus.EXPIRED:
        return StatusLabel.EXPIRED
      case DepositStatus.L1_PENDING:
      case DepositStatus.L2_PENDING:
        return StatusLabel.PENDING
      default:
        return StatusLabel.SUCCESS
    }
  } else {
    switch (tx.status) {
      case WithdrawalStatus.EXECUTED:
        return StatusLabel.SUCCESS
      case WithdrawalStatus.CONFIRMED:
        return StatusLabel.CLAIMABLE
      case WithdrawalStatus.UNCONFIRMED:
        return StatusLabel.PENDING
      default:
        return StatusLabel.FAILURE
    }
  }
}

function getTxDurationInMinutes(tx: MergedTransaction) {
  const { parentChainId } = tx
  const { isEthereumMainnet, isEthereumMainnetOrTestnet, isTestnet } =
    isNetwork(parentChainId)

  if (isDeposit(tx)) {
    if (!isEthereumMainnetOrTestnet) {
      return 1
    }

    return isTestnet ? 10 : 15
  }

  // Withdrawals
  const SEVEN_DAYS_IN_MINUTES = 7 * 24 * 60

  if (isEthereumMainnet) {
    return SEVEN_DAYS_IN_MINUTES
  }

  // Node is created every ~1h for all other chains
  return 60
}

export function getTxRemainingTimeInMinutes(tx: MergedTransaction) {
  const now = dayjs()
  const { createdAt } = tx

  if (!isTxPending(tx)) {
    return null
  }

  // For new txs createdAt won't be defined yet, we default to the current time in that case
  const createdAtDate = createdAt ? dayjs(createdAt) : dayjs()
  const CONFIRMATION_BUFFER_MINUTES = isDeposit(tx) ? 0 : 30

  return Math.max(
    getTxDurationInMinutes(tx) -
      now.diff(createdAtDate, 'minutes') +
      CONFIRMATION_BUFFER_MINUTES,
    0
  )
}

export function getTxCompletionDate(tx: MergedTransaction) {
  const minutesLeft = getTxRemainingTimeInMinutes(tx)
  const { createdAt, resolvedAt } = tx

  if (typeof minutesLeft !== 'number' || !createdAt) {
    return null
  }

  if (!isTxPending(tx)) {
    return resolvedAt ? dayjs(resolvedAt) : null
  }

  return dayjs(createdAt).add(minutesLeft, 'minutes')
}

export function getTxHumanReadableRemainingTime(tx: MergedTransaction) {
  const minutesLeft = getTxRemainingTimeInMinutes(tx)

  if (!minutesLeft) {
    return null
  }

  const hoursLeft = Math.floor(minutesLeft / 60)
  const daysLeft = Math.floor(hoursLeft / 24)

  const formattedDaysLeft = daysLeft === 1 ? '1 day' : `${daysLeft} days`
  const formattedHoursLeft = hoursLeft === 1 ? '1 hr' : `${daysLeft} hrs`
  const formattedMinutesLeft =
    minutesLeft === 1 ? '1 min' : `${minutesLeft} mins`

  if (daysLeft > 0) {
    return `${formattedDaysLeft} ${hoursLeft % 60}${
      hoursLeft % 60 === 1 ? ' hr' : ' hrs'
    }`
  }
  if (hoursLeft > 0) {
    return `${formattedHoursLeft} ${minutesLeft % 60}${
      minutesLeft % 60 === 1 ? ' min' : ' mins'
    }`
  }
  if (minutesLeft > 0) {
    return formattedMinutesLeft
  }
  return 'Almost there...'
}
