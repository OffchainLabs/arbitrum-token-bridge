import { ConnectionState } from '../../util'
import { BigNumber } from 'ethers'
import {
  ArbTokenBridge,
  ERC20BridgeToken,
  NodeBlockDeadlineStatus
} from '../../hooks/arbTokenBridge.types'
import {
  L1ToL2MessageData,
  L2ToL1MessageData,
  Transaction,
  TxnType
} from '../../hooks/useTransactions'

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
  transactions: Transaction[]
  warningTokens: WarningTokens
  connectionState: number
  verifying: WhiteListState
  selectedToken: ERC20BridgeToken | null
  isDepositMode: boolean
  l1NetworkChainId: number | null
  l2NetworkChainId: number | null
  arbTokenBridgeLoaded: boolean
}

export const defaultState: AppState = {
  arbTokenBridge: {} as ArbTokenBridge,
  transactions: [] as Transaction[],
  warningTokens: {} as WarningTokens,
  connectionState: ConnectionState.LOADING,
  l1NetworkChainId: null,
  l2NetworkChainId: null,
  verifying: WhiteListState.ALLOWED,
  selectedToken: null,
  isDepositMode: true,
  arbTokenBridgeLoaded: false
}
export const state: AppState = {
  ...defaultState
}
