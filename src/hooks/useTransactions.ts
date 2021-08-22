import { useReducer, useEffect, useCallback } from 'react'
import { TransactionReceipt } from '@ethersproject/abstract-provider'
import { AssetType, TransactionActions } from './arbTokenBridge.types'
import { ethers } from 'ethers'

type Action =
  | { type: 'ADD_TRANSACTION'; transaction: Transaction }
  | { type: 'SET_SUCCESS'; txID: string }
  | { type: 'SET_FAILURE'; txID: string }
  | { type: 'SET_INITIAL_TRANSACTIONS'; transactions: Transaction[] }
  | { type: 'CLEAR_PENDING' }
  | { type: 'CONFIRM_TRANSACTION'; txID: string }
  | { type: 'REMOVE_TRANSACTION'; txID: string }
  | { type: 'SET_BLOCK_NUMBER'; txID: string; blockNumber?: number }
  | { type: 'SET_RESOLVED_TIMESTAMP'; txID: string; timestamp?: number }

export type TxnStatus = 'pending' | 'success' | 'failure' | 'confirmed'

/** @interface
 * Transaction
 * @alias Transaction
 * @description Bridge transaction data with up to date status.
 */
export type TxnType =
  | 'deposit'
  | 'deposit-l1'
  | 'deposit-l2'
  | 'withdraw'
  | 'outbox'
  | 'approve'
  | 'connext-deposit'
  | 'connext-withdraw'
  | 'deposit-l2-auto-redeem'

export const txnTypeToLayer = (txnType: TxnType): 1 | 2 => {
  switch (txnType) {
    case 'deposit':
    case 'deposit-l1':
    case 'outbox':
    case 'approve':
    case 'connext-deposit':
      return 1
    case 'deposit-l2':
    case 'withdraw':
    case 'connext-withdraw':
    case 'deposit-l2-auto-redeem':
      return 2
  }
}
type TransactionBase = {
  type: TxnType
  status: TxnStatus
  value: string | null
  txID?: string
  assetName: string
  assetType: AssetType
  sender: string
  blockNumber?: number
  l1NetworkID: string
  timestampResolved?: number // time when its status was changed
  timestampCreated?: Date //time when this transaction is first added to the list
}

export interface Transaction extends TransactionBase {
  txID: string
}

export interface NewTransaction extends TransactionBase {
  status: 'pending'
}

export interface FailedTransaction extends TransactionBase {
  status: 'failure'
}

function updateStatus(state: Transaction[], status: TxnStatus, txID: string) {
  const newState = [...state]
  const index = newState.findIndex(txn => txn.txID === txID)
  if (index === -1) {
    console.warn('transaction not found', txID)
    return state
  }
  newState[index] = {
    ...newState[index],
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
  if (index === -1) {
    console.warn('transaction not found', txID)
    return state
  }
  newState[index] = {
    ...newState[index],
    blockNumber
  }
  return newState
}

function updateResolvedTimestamp(
  state: Transaction[],
  txID: string,
  timestamp?: number
) {
  const newState = [...state]
  const index = newState.findIndex(txn => txn.txID === txID)
  if (index === -1) {
    console.warn('transaction not found', txID)
    return state
  }
  newState[index] = {
    ...newState[index],
    timestampResolved: timestamp
  }
  return newState
}
function reducer(state: Transaction[], action: Action) {
  switch (action.type) {
    case 'SET_INITIAL_TRANSACTIONS': {
      return [...action.transactions]
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
    default:
      return state
  }
}

const localStorageReducer = (state: Transaction[], action: Action) => {
  const newState = reducer(state, action)
  window.localStorage.setItem('arbTransactions', JSON.stringify(newState))
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
    const tx = { ...transaction, timestampCreated: new Date() } as Transaction
    return dispatch({
      type: 'ADD_TRANSACTION',
      transaction: tx
    })
  }
  const addFailedTransaction = (transaction: FailedTransaction) => {
    if (!transaction.txID) {
      console.warn(' Cannot add transaction: TxID not included (???)')
      return
    }
    const tx = transaction as Transaction
    return dispatch({
      type: 'ADD_TRANSACTION',
      transaction: tx
    })
  }

  const removeTransaction = (txID: string) => {
    return dispatch({
      type: 'REMOVE_TRANSACTION',
      txID: txID
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
  const setResolvedTimestamp = (txID: string, timestamp?: number) => {
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
  const clearPendingTransactions = () => {
    return dispatch({
      type: 'CLEAR_PENDING'
    })
  }

  const setTransactionConfirmed = (txID: string) => {
    return dispatch({
      type: 'CONFIRM_TRANSACTION',
      txID: txID
    })
  }

  const updateTransaction = (
    txReceipt: TransactionReceipt,
    tx?: ethers.ContractTransaction
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
    console.log('TX for update', tx)
    if (tx?.blockNumber) {
      setTransactionBlock(txReceipt.transactionHash, tx.blockNumber)
    }
    if (tx?.timestamp) {
      setResolvedTimestamp(txReceipt.transactionHash, tx.timestamp)
    }
  }

  const checkAndUpdatePendingTransactions = useCallback(() => {
    const pendingTransactions = 1
  }, [state])

  return [
    state,
    {
      addTransaction,
      setTransactionSuccess,
      setTransactionFailure,
      clearPendingTransactions,
      setTransactionConfirmed,
      updateTransaction,
      removeTransaction,
      addFailedTransaction
    }
  ]
}

export default useTransactions
