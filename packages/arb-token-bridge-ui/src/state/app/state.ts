import { BigNumber } from 'ethers'
import {
  ArbTokenBridge,
  AssetType,
  ERC20BridgeToken,
  NodeBlockDeadlineStatus
} from '../../hooks/arbTokenBridge.types'
import {
  ParentToChildMessageData,
  ChildToParentMessageData,
  TxnType
} from '../../hooks/useTransactions'
import { ConnectionState } from '../../util'
import { CCTPSupportedChainId } from '../cctpState'
import { Address } from '../../util/AddressUtils'

export enum WhiteListState {
  VERIFYING,
  ALLOWED,
  DISALLOWED
}

export enum DepositStatus {
  PARENT_PENDING = 1,
  PARENT_FAILURE = 2,
  CHILD_PENDING = 3,
  CHILD_SUCCESS = 4,
  CHILD_FAILURE = 5,
  CREATION_FAILED = 6,
  EXPIRED = 7,
  CCTP_DEFAULT_STATE = 8 // Cctp only relies on tx.status
}

export enum WithdrawalStatus {
  EXECUTED = 'Executed',
  UNCONFIRMED = 'Unconfirmed',
  CONFIRMED = 'Confirmed',
  EXPIRED = 'Expired',
  FAILURE = 'Failure'
}

export interface MergedTransaction {
  // TODO: https://github.com/OffchainLabs/arbitrum-token-bridge/blob/master/packages/arb-token-bridge-ui/src/util/withdrawals/helpers.ts#L31
  // should return sender as well, then we can make it non-optional
  sender?: string
  destination?: string
  direction: TxnType
  status: string | undefined // TODO: Use enums
  createdAt: number | null
  resolvedAt: number | null
  txId: string
  asset: string
  assetType: AssetType
  value: string | null
  uniqueId: BigNumber | null
  isWithdrawal: boolean
  blockNum: number | null
  tokenAddress: string | null
  isCctp?: boolean
  nodeBlockDeadline?: NodeBlockDeadlineStatus
  parentToChildMsgData?: ParentToChildMessageData
  childToParentMsgData?: ChildToParentMessageData
  depositStatus?: DepositStatus
  childChainId: number
  parentChainId: number
  sourceChainId: number
  destinationChainId: number
  cctpData?: {
    sourceChainId?: CCTPSupportedChainId
    attestationHash?: Address | null
    messageBytes?: string | null
    receiveMessageTransactionHash?: Address | null
    receiveMessageTimestamp?: number | null
  }
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
  selectedToken: ERC20BridgeToken | null
  verifying: WhiteListState
  parentNetworkChainId: number | null
  childNetworkChainId: number | null
  arbTokenBridgeLoaded: boolean
}

export const defaultState: AppState = {
  arbTokenBridge: {} as ArbTokenBridge,
  warningTokens: {} as WarningTokens,
  connectionState: ConnectionState.LOADING,
  parentNetworkChainId: null,
  childNetworkChainId: null,
  verifying: WhiteListState.ALLOWED,
  selectedToken: null,
  arbTokenBridgeLoaded: false
}
export const state: AppState = {
  ...defaultState
}
