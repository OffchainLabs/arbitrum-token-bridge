import { useReducer, useEffect, useMemo } from 'react'
import { TransactionReceipt } from '@ethersproject/abstract-provider'
import { AssetType, TransactionActions } from './arbTokenBridge.types'
import { BigNumber, ethers } from 'ethers'
import { ParentToChildMessageStatus } from '@arbitrum/sdk'
import {
  MergedTransaction,
  TeleporterMergedTransaction
} from '../state/app/state'

type Action =
  | { type: 'ADD_TRANSACTION'; transaction: Transaction }
  | { type: 'SET_SUCCESS'; txID: string }
  | { type: 'SET_FAILURE'; txID: string }
  | { type: 'SET_INITIAL_TRANSACTIONS'; transactions: Transaction[] }
  | { type: 'CLEAR_PENDING' }
  | { type: 'CONFIRM_TRANSACTION'; txID: string }
  | { type: 'REMOVE_TRANSACTION'; txID: string }
  | { type: 'SET_BLOCK_NUMBER'; txID: string; blockNumber?: number }
  | { type: 'SET_RESOLVED_TIMESTAMP'; txID: string; timestamp?: string }
  | { type: 'ADD_TRANSACTIONS'; transactions: Transaction[] }
  | {
      type: 'UPDATE_PARENT_TO_CHILD_MSG_DATA'
      txID: string
      parentToChildMsgData: ParentToChildMessageData
    }
  | { type: 'SET_TRANSACTIONS'; transactions: Transaction[] }

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

const deprecatedTxTypes: Set<TxnType> = new Set([
  'deposit-l2-auto-redeem',
  'deposit-l2-ticket-created',
  'deposit-l2'
])

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

function updateStatus(state: Transaction[], status: TxnStatus, txID: string) {
  const newState = [...state]
  const index = newState.findIndex(txn => txn.txID === txID)
  const transaction = newState[index]

  if (!transaction) {
    console.warn('transaction not found', txID)
    return state
  }

  newState[index] = {
    ...transaction,
    status
  }
  return newState
}

function updateBlockNumber(
  state: Transaction[],
  txID: string,
  blockNumber?: number
) {
  const newState = [...state]
  const index = newState.findIndex(txn => txn.txID === txID)
  const transaction = newState[index]

  if (!transaction) {
    console.warn('transaction not found', txID)
    return state
  }

  newState[index] = {
    ...transaction,
    blockNumber
  }
  return newState
}

function updateTxnParentToChildMsg(
  state: Transaction[],
  txID: string,
  parentToChildMsgData: ParentToChildMessageData
) {
  const newState = [...state]
  const index = newState.findIndex(txn => txn.txID === txID)
  const transaction = newState[index]

  if (!transaction) {
    console.warn('transaction not found', txID)
    return state
  }

  if (!(transaction.type === 'deposit' || transaction.type === 'deposit-l1')) {
    throw new Error(
      "Attempting to add a parentToChildMsg to a tx that isn't a deposit:" +
        txID
    )
  }

  const previousParentToChildMsgData = transaction.parentToChildMsgData
  if (!previousParentToChildMsgData) {
    newState[index] = {
      ...transaction,
      parentToChildMsgData: {
        status: parentToChildMsgData.status,
        retryableCreationTxID: parentToChildMsgData.retryableCreationTxID,
        fetchingUpdate: false
      }
    }
    return newState
  }

  newState[index] = {
    ...transaction,
    parentToChildMsgData: {
      ...previousParentToChildMsgData,
      ...parentToChildMsgData
    }
  }
  return newState
}

function updateResolvedTimestamp(
  state: Transaction[],
  txID: string,
  timestamp?: string
) {
  const newState = [...state]
  const index = newState.findIndex(txn => txn.txID === txID)
  const transaction = newState[index]

  if (!transaction) {
    console.warn('transaction not found', txID)
    return state
  }

  newState[index] = {
    ...transaction,
    timestampResolved: timestamp
  }

  return newState
}
function reducer(state: Transaction[], action: Action) {
  switch (action.type) {
    case 'SET_INITIAL_TRANSACTIONS': {
      // Add l1 to L2 stuff with pending status
      return [...action.transactions]
    }
    case 'ADD_TRANSACTIONS': {
      // sanity / safety check: ensure no duplicates:
      const currentTxIds = new Set(state.map(tx => tx.txID))
      const txsToAdd = action.transactions.filter(tx => {
        if (!currentTxIds.has(tx.txID)) {
          return true
        } else {
          console.warn(
            `Warning: trying to add ${tx.txID} which is already included`
          )
          return false
        }
      })
      return state.concat(txsToAdd)
    }
    case 'ADD_TRANSACTION': {
      return state.concat(action.transaction)
    }
    case 'REMOVE_TRANSACTION': {
      return state.filter(txn => txn.txID !== action.txID)
    }
    case 'SET_SUCCESS': {
      return updateStatus(state, 'success', action.txID)
    }
    case 'SET_FAILURE': {
      return updateStatus(state, 'failure', action.txID)
    }
    case 'CLEAR_PENDING': {
      return state.filter(txn => txn.status !== 'pending')
    }
    case 'CONFIRM_TRANSACTION': {
      return updateStatus(state, 'confirmed', action.txID)
    }
    case 'SET_BLOCK_NUMBER': {
      return updateBlockNumber(state, action.txID, action.blockNumber)
    }
    case 'SET_RESOLVED_TIMESTAMP': {
      return updateResolvedTimestamp(state, action.txID, action.timestamp)
    }
    case 'UPDATE_PARENT_TO_CHILD_MSG_DATA': {
      return updateTxnParentToChildMsg(
        state,
        action.txID,
        action.parentToChildMsgData
      )
    }
    case 'SET_TRANSACTIONS': {
      return action.transactions
    }
    default:
      return state
  }
}

const localStorageReducer = (state: Transaction[], action: Action) => {
  const newState = reducer(state, action)
  // don't cache fetchingUpdate state
  const stateForCache = newState.map(tx => {
    if (tx.parentToChildMsgData && tx.parentToChildMsgData.fetchingUpdate) {
      return {
        ...tx,
        parentToChildMsgData: {
          ...tx.parentToChildMsgData,
          fetchingUpdate: false
        }
      }
    }
    return tx
  })
  window.localStorage.setItem('arbTransactions', JSON.stringify(stateForCache))
  return newState
}

const useTransactions = (): [Transaction[], TransactionActions] => {
  const [state, dispatch] = useReducer(localStorageReducer, [])

  useEffect(() => {
    const cachedTransactions = window.localStorage.getItem('arbTransactions')
    dispatch({
      type: 'SET_INITIAL_TRANSACTIONS',
      transactions: cachedTransactions ? JSON.parse(cachedTransactions) : []
    })
  }, [])

  const addTransaction = (transaction: NewTransaction) => {
    if (!transaction.txID) {
      console.warn(' Cannot add transaction: TxID not included (???)')
      return
    }
    const tx = {
      ...transaction,
      timestampCreated: new Date().toISOString()
    } as Transaction
    return dispatch({
      type: 'ADD_TRANSACTION',
      transaction: tx
    })
  }

  const updateTxnParentToChildMsgData = async (
    txID: string,
    parentToChildMsgData: ParentToChildMessageData
  ) => {
    dispatch({
      type: 'UPDATE_PARENT_TO_CHILD_MSG_DATA',
      txID: txID,
      parentToChildMsgData
    })
  }

  const setTransactionSuccess = (txID: string) => {
    return dispatch({
      type: 'SET_SUCCESS',
      txID: txID
    })
  }
  const setTransactionBlock = (txID: string, blockNumber?: number) => {
    return dispatch({
      type: 'SET_BLOCK_NUMBER',
      txID,
      blockNumber
    })
  }
  const setResolvedTimestamp = (txID: string, timestamp?: string) => {
    return dispatch({
      type: 'SET_RESOLVED_TIMESTAMP',
      txID,
      timestamp
    })
  }
  const setTransactionFailure = (txID?: string) => {
    if (!txID) {
      console.warn(' Cannot set transaction failure: TxID not included (???)')
      return
    }
    return dispatch({
      type: 'SET_FAILURE',
      txID: txID
    })
  }

  const updateTransaction = (
    txReceipt: TransactionReceipt,
    tx?: ethers.ContractTransaction,
    parentToChildMsgData?: ParentToChildMessageData
  ) => {
    if (!txReceipt.transactionHash) {
      return console.warn(
        '*** TransactionHash not included in transaction receipt (???) *** '
      )
    }
    switch (txReceipt.status) {
      case 0: {
        setTransactionFailure(txReceipt.transactionHash)
        break
      }
      case 1: {
        setTransactionSuccess(txReceipt.transactionHash)
        break
      }
      default:
        console.warn('*** Status not included in transaction receipt *** ')
        break
    }
    if (tx?.blockNumber) {
      setTransactionBlock(txReceipt.transactionHash, tx.blockNumber)
    }
    if (tx) {
      setResolvedTimestamp(txReceipt.transactionHash, new Date().toISOString())
    }
    if (parentToChildMsgData) {
      updateTxnParentToChildMsgData(
        txReceipt.transactionHash,
        parentToChildMsgData
      )
    }
  }

  const transactions = useMemo(() => {
    return state.filter(tx => !deprecatedTxTypes.has(tx.type))
  }, [state])

  return [
    transactions,
    {
      addTransaction,
      updateTransaction
    }
  ]
}

export default useTransactions
