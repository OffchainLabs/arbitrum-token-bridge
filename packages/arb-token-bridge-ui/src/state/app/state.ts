import dayjs from 'dayjs'
import { ethers, BigNumber } from 'ethers'
import {
  isEmpty as _isEmpty,
  reverse as _reverse,
  sortBy as _sortBy
} from 'lodash-es'
import { derived } from 'overmind'
import {
  ArbTokenBridge,
  ERC20BridgeToken,
  L2ToL1EventResultPlus,
  Transaction,
  TxnType,
  OutgoingMessageState,
  NodeBlockDeadlineStatus,
  L1ToL2MessageData,
  L2ToL1MessageData,
  getUniqueIdOrHashFromEvent
} from 'token-bridge-sdk'
import { L1Network, L2Network, L1ToL2MessageStatus } from '@arbitrum/sdk'

import { ConnectionState, PendingWithdrawalsLoadedState } from '../../util'

export enum WhiteListState {
  VERIFYING,
  ALLOWED,
  DISALLOWED
}

export enum DepositStatus {
  L1_PENDING = 1,
  L1_FAILURE = 2,
  L2_PENDING = 3,
  L2_SUCCESS = 4,
  L2_FAILURE = 5,
  CREATION_FAILED = 6,
  EXPIRED = 7
}

const getDepositStatus = (tx: Transaction) => {
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

export interface MergedTransaction {
  direction: TxnType
  status: string
  createdAtTime: number | null
  createdAt: string | null
  resolvedAt: string | null
  txId: string
  asset: string
  value: string | null
  uniqueId: BigNumber | null
  isWithdrawal: boolean
  blockNum: number | null
  tokenAddress: string | null
  nodeBlockDeadline?: NodeBlockDeadlineStatus
  l1ToL2MsgData?: L1ToL2MessageData
  l2ToL1MsgData?: L2ToL1MessageData
  depositStatus?: DepositStatus
}

export interface WarningTokens {
  [address: string]: {
    address: string
    type: number
  }
}

const outgoungStateToString = {
  [OutgoingMessageState.UNCONFIRMED]: 'Unconfirmed',
  [OutgoingMessageState.CONFIRMED]: 'Confirmed',
  [OutgoingMessageState.EXECUTED]: 'Executed'
}

export type AppState = {
  arbTokenBridge: ArbTokenBridge
  warningTokens: WarningTokens
  connectionState: number
  verifying: WhiteListState
  selectedToken: ERC20BridgeToken | null
  isDepositMode: boolean
  sortedTransactions: Transaction[]
  pendingTransactions: Transaction[]
  l1DepositsWithUntrackedL2Messages: Transaction[]
  failedRetryablesToRedeem: MergedTransaction[]
  depositsTransformed: MergedTransaction[]
  withdrawalsTransformed: MergedTransaction[]
  mergedTransactions: MergedTransaction[]

  l1NetworkChainId: number | null
  l2NetworkChainId: number | null

  pwLoadedState: PendingWithdrawalsLoadedState
  arbTokenBridgeLoaded: boolean

  changeNetwork: ((network: L1Network | L2Network) => Promise<void>) | null
}

export const defaultState: AppState = {
  arbTokenBridge: {} as ArbTokenBridge,
  warningTokens: {} as WarningTokens,
  connectionState: ConnectionState.LOADING,
  l1NetworkChainId: null,
  l2NetworkChainId: null,
  verifying: WhiteListState.ALLOWED,
  selectedToken: null,
  isDepositMode: true,
  sortedTransactions: derived((s: AppState) => {
    const transactions = s.arbTokenBridge?.transactions?.transactions || []
    return [...transactions]
      .filter(tx => tx.sender === s.arbTokenBridge.walletAddress)
      .filter(tx => {
        const matchesL1 = tx.l1NetworkID === String(s.l1NetworkChainId)
        const matchesL2 = tx.l2NetworkID === String(s.l2NetworkChainId)

        // The `l2NetworkID` field was added later, so not all transactions will have it
        if (typeof tx.l2NetworkID === 'undefined') {
          return matchesL1
        }

        return matchesL1 && matchesL2
      })
      .reverse()
  }),
  pendingTransactions: derived((s: AppState) => {
    return s.sortedTransactions.filter(tx => tx.status === 'pending')
  }),
  l1DepositsWithUntrackedL2Messages: derived((s: AppState) => {
    // check 'deposit' and 'deposit-l1' for backwards compatibility with old client side cache
    return s.sortedTransactions.filter(
      (txn: Transaction) =>
        (txn.type === 'deposit' || txn.type === 'deposit-l1') &&
        txn.status === 'success' &&
        (!txn.l1ToL2MsgData ||
          (txn.l1ToL2MsgData.status === L1ToL2MessageStatus.NOT_YET_CREATED &&
            !txn.l1ToL2MsgData.fetchingUpdate))
    )
  }),
  failedRetryablesToRedeem: derived((s: AppState) => {
    return s.depositsTransformed.filter(
      tx => tx.depositStatus === DepositStatus.L2_FAILURE
    )
  }),
  depositsTransformed: derived((s: AppState) => {
    const deposits: MergedTransaction[] = s.sortedTransactions.map(tx => {
      return {
        direction: tx.type,
        status: tx.status,
        createdAt: tx.timestampCreated
          ? dayjs(tx.timestampCreated).format('HH:mm:ss MM/DD/YYYY')
          : null,
        createdAtTime: tx.timestampCreated
          ? dayjs(tx.timestampCreated).toDate().getTime()
          : null,
        resolvedAt: tx.timestampResolved
          ? dayjs(new Date(tx.timestampResolved)).format('HH:mm:ss MM/DD/YYYY')
          : null,
        txId: tx.txID,
        asset: tx.assetName?.toLowerCase(),
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
    return deposits
  }),
  withdrawalsTransformed: derived((s: AppState) => {
    const withdrawals: MergedTransaction[] = (
      Object.values(
        s.arbTokenBridge?.pendingWithdrawalsMap || []
      ) as L2ToL1EventResultPlus[]
    ).map(tx => {
      const uniqueIdOrHash = getUniqueIdOrHashFromEvent(tx)

      return {
        direction: 'outbox',
        status:
          tx.nodeBlockDeadline === 'EXECUTE_CALL_EXCEPTION'
            ? 'Failure'
            : outgoungStateToString[tx.outgoingMessageState],
        createdAt: dayjs(
          new Date(BigNumber.from(tx.timestamp).toNumber() * 1000)
        ).format('HH:mm:ss MM/DD/YYYY'),
        createdAtTime:
          BigNumber.from(tx.timestamp).toNumber() * 1000 +
          (uniqueIdOrHash ? 1000 : 0), // adding 60s for the sort function so that it comes before l2 action
        resolvedAt: null,
        txId: tx.l2TxHash || 'l2-tx-hash-not-found',
        asset: tx.symbol?.toLocaleLowerCase(),
        value: ethers.utils.formatUnits(tx.value?.toString(), tx.decimals),
        uniqueId: uniqueIdOrHash,
        isWithdrawal: true,
        blockNum: tx.ethBlockNum.toNumber(),
        tokenAddress: tx.tokenAddress || null,
        nodeBlockDeadline: tx.nodeBlockDeadline
      }
    })
    return withdrawals
  }),
  mergedTransactions: derived((s: AppState) => {
    return _reverse(
      _sortBy([...s.depositsTransformed, ...s.withdrawalsTransformed], item => {
        if (_isEmpty(item.createdAt)) {
          return -1
        }
        return item.createdAtTime
      })
    )
  }),
  pwLoadedState: PendingWithdrawalsLoadedState.LOADING,
  arbTokenBridgeLoaded: false,
  changeNetwork: null
}
export const state: AppState = {
  ...defaultState
}
