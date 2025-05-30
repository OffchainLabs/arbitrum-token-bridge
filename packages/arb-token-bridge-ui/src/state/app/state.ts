import { TransactionRequest } from '@lifi/sdk'
import { BigNumber } from 'ethers'

import { AmountWithToken } from '@/token-bridge-sdk/LifiTransferStarter'

import {
  ArbTokenBridge,
  AssetType,
  NodeBlockDeadlineStatus
} from '../../hooks/arbTokenBridge.types'
import {
  ChildToParentMessageData,
  L2ToL3MessageData,
  ParentToChildMessageData,
  TxnType
} from '../../types/Transactions'
import { Address } from '../../util/AddressUtils'
import { CCTPSupportedChainId } from '../cctpState'

export enum DepositStatus {
  L1_PENDING = 1,
  L1_FAILURE = 2,
  L2_PENDING = 3,
  L2_SUCCESS = 4,
  L2_FAILURE = 5,
  CREATION_FAILED = 6,
  EXPIRED = 7,
  CCTP_DEFAULT_STATE = 8, // Cctp only relies on tx.status
  LIFI_DEFAULT_STATE = 9
}

export enum WithdrawalStatus {
  EXECUTED = 'Executed',
  UNCONFIRMED = 'Unconfirmed',
  CONFIRMED = 'Confirmed',
  EXPIRED = 'Expired',
  FAILURE = 'Failure'
}

export type MergedTransactionLifiData = {
  toolDetails: { key: string; name: string; logoURI: string }
  durationMs: number
  fromAmount: AmountWithToken
  toAmount: AmountWithToken
  destinationTxId: string | null
  transactionRequest: TransactionRequest
}
export interface BaseMergedTransaction {
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
  isOft?: false
  isLifi?: false
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

export interface LifiMergedTransaction
  extends Omit<BaseMergedTransaction, 'isLifi'>,
    MergedTransactionLifiData {
  isLifi: true
  destinationStatus: WithdrawalStatus
}

export interface TeleporterMergedTransaction extends BaseMergedTransaction {
  /** note: in contrast to general deposits which use `parentToChildMsgData`,
   * Teleport transfers still follow L1/L2/L3 terminology, so we have `l1ToL2MsgData` and `l2ToL3MsgData` */
  l1ToL2MsgData?: ParentToChildMessageData
  l2ToL3MsgData: L2ToL3MessageData
}

/*
 * LayerZero API returns LayerZeroTransaction` without `asset` and `value`.
 * `updateAdditionalLayerZeroData()` fills these gaps, returning `MergedTransaction` for tx history.
 */
export interface LayerZeroTransaction
  extends Omit<BaseMergedTransaction, 'isOft'> {
  isOft: true
  destinationTxHash?: string | null
}

export type MergedTransaction =
  | BaseMergedTransaction
  | LifiMergedTransaction
  | TeleporterMergedTransaction
  | LayerZeroTransaction

export interface WarningTokens {
  [address: string]: {
    address: string
    type: number
  }
}

export type AppState = {
  arbTokenBridge: ArbTokenBridge
  warningTokens: WarningTokens
  l1NetworkChainId: number | null
  l2NetworkChainId: number | null
  arbTokenBridgeLoaded: boolean
}

export const defaultState: AppState = {
  arbTokenBridge: {} as ArbTokenBridge,
  warningTokens: {} as WarningTokens,
  l1NetworkChainId: null,
  l2NetworkChainId: null,
  arbTokenBridgeLoaded: false
}
export const state: AppState = {
  ...defaultState
}
