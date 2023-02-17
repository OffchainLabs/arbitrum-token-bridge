import {
  isEmpty as _isEmpty,
  reverse as _reverse,
  sortBy as _sortBy
} from 'lodash-es'
import { derived } from 'overmind'
import {
  ArbTokenBridge,
  ERC20BridgeToken,
  L1ToL2MessageData,
  L2ToL1EventResultPlus,
  L2ToL1MessageData,
  NodeBlockDeadlineStatus,
  Transaction,
  TxnType
} from 'token-bridge-sdk'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'

import { ConnectionState } from '../../util'
import {
  filterDeposits,
  transformDeposits,
  transformWithdrawals
} from './utils'
import { BigNumber } from 'ethers'
import dayjs from 'dayjs'

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
  EXPIRED = 7,
  ERROR_FETCHING_DETAILS = 8 // when we're unable to fetch tx details coz of sdk errors (historical data)
}

export interface MergedTransaction {
  direction: TxnType
  status: string
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
  arbTokenBridgeLoaded: boolean
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
    return filterDeposits(
      [...transactions],
      s.arbTokenBridge.walletAddress,
      s.l1NetworkChainId,
      s.l2NetworkChainId
    )
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
    return transformDeposits(s.sortedTransactions)
  }),
  withdrawalsTransformed: derived((s: AppState) => {
    return transformWithdrawals(
      Object.values(
        s.arbTokenBridge?.pendingWithdrawalsMap || []
      ) as L2ToL1EventResultPlus[]
    )
  }),
  mergedTransactions: derived((s: AppState) => {
    return _reverse(
      _sortBy([...s.depositsTransformed, ...s.withdrawalsTransformed], item => {
        if (_isEmpty(item.createdAt)) {
          return -1
        }
        return dayjs(item.createdAt).unix() // numeric format
      })
    )
  }),
  arbTokenBridgeLoaded: false
}
export const state: AppState = {
  ...defaultState
}
