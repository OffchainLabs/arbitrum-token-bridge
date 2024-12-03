import { AssetType } from './arbTokenBridge.types'
import { BigNumber } from 'ethers'
import { ParentToChildMessageStatus } from '@arbitrum/sdk'
import {
  MergedTransaction,
  TeleporterMergedTransaction
} from '../state/app/state'

export type TxnStatus = 'pending' | 'success' | 'failure' | 'confirmed'

/** @interface
 * Transaction
 * @alias Transaction
 * @description Bridge transaction data with up to date status.
 */
export type TxnType =
  | 'deposit'
  | 'deposit-l1'
  | 'deposit-l2' // unused; keeping for cache backwrads compatability
  | 'withdraw'
  | 'outbox'
  | 'approve'
  | 'deposit-l2-auto-redeem' // unused; keeping for cache backwrads compatability
  | 'deposit-l2-ticket-created' // unused; keeping for cache backwrads compatability
  | 'approve-l2'

export const txnTypeToLayer = (txnType: TxnType): 1 | 2 => {
  switch (txnType) {
    case 'deposit':
    case 'deposit-l1':
    case 'outbox':
    case 'approve':
      return 1
    case 'deposit-l2':
    case 'withdraw':
    case 'deposit-l2-auto-redeem':
    case 'deposit-l2-ticket-created':
    case 'approve-l2':
      return 2
  }
}

export interface ParentToChildMessageData {
  status: ParentToChildMessageStatus
  retryableCreationTxID: string
  childTxId?: string
  fetchingUpdate: boolean
}

export interface L2ToL3MessageData {
  status: ParentToChildMessageStatus
  retryableCreationTxID?: string
  l2ForwarderRetryableTxID?: string
  l3TxID?: string
  l2ChainId: number
}

export type ChildToParentMessageData = {
  uniqueId: BigNumber
}

type TransactionBase = {
  type: TxnType
  status?: TxnStatus
  value: string | null
  value2?: string
  txID?: string
  assetName: string
  assetType: AssetType
  tokenAddress?: string
  sender: string
  destination?: string
  blockNumber?: number
  l1NetworkID: string
  l2NetworkID?: string
  timestampResolved?: string // time when its status was changed
  timestampCreated?: string //time when this transaction is first added to the list
  parentToChildMsgData?: ParentToChildMessageData
  childToParentMsgData?: ChildToParentMessageData
  isClassic?: boolean
}

export interface Transaction extends TransactionBase {
  txID: string
  direction: 'deposit' | 'withdrawal'
  source: 'subgraph' | 'event_logs' | 'local_storage_cache'
  parentChainId: number
  childChainId: number
  nonce?: number
}

export interface TeleporterTransaction extends Transaction {
  l2ToL3MsgData: L2ToL3MessageData
}

export interface NewTransaction extends TransactionBase {
  status: 'pending'
}

export interface FailedTransaction extends TransactionBase {
  status: 'failure'
}

// TODO: enforce this type restriction
export interface DepositTransaction extends Transaction {
  parentToChildMsgData: ParentToChildMessageData
  type: 'deposit' | 'deposit-l1'
}

export function isTeleportTx(
  tx: Transaction | MergedTransaction
): tx is TeleporterTransaction | TeleporterMergedTransaction {
  return (tx as TeleporterTransaction).l2ToL3MsgData !== undefined
}
