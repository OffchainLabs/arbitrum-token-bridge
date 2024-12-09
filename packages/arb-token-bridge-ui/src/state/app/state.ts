import { BigNumber } from 'ethers'
import {
  AssetType,
  ERC20BridgeToken,
  NodeBlockDeadlineStatus
} from '../../hooks/arbTokenBridge.types'
import {
  ParentToChildMessageData,
  ChildToParentMessageData,
  L2ToL3MessageData,
  TxnType
} from '../../hooks/useTransactions'
import { CCTPSupportedChainId } from '../cctpState'
import { Address } from '../../util/AddressUtils'

export enum DepositStatus {
  L1_PENDING = 1,
  L1_FAILURE = 2,
  L2_PENDING = 3,
  L2_SUCCESS = 4,
  L2_FAILURE = 5,
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
  value2?: string
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

export interface TeleporterMergedTransaction extends MergedTransaction {
  l1ToL2MsgData?: ParentToChildMessageData
  l2ToL3MsgData: L2ToL3MessageData
}

export interface WarningTokens {
  [address: string]: {
    address: string
    type: number
  }
}

export type AppState = {
  warningTokens: WarningTokens
  selectedToken: ERC20BridgeToken | null
}

export const defaultState: AppState = {
  warningTokens: {} as WarningTokens,
  selectedToken: null
}
export const state: AppState = {
  ...defaultState
}
