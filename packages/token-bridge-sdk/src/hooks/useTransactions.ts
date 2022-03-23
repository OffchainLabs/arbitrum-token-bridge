import { useReducer, useEffect } from 'react'
import { TransactionReceipt } from '@ethersproject/abstract-provider'
import { AssetType, TransactionActions } from './arbTokenBridge.types'
import { ethers } from 'ethers'
import { L1ToL2Message } from '@arbitrum/sdk'

type Action =
  | { type: 'ADD_TRANSACTION'; transaction: Transaction }
  | { type: 'SET_SUCCESS'; txID: string; seqNum?: number }
  | { type: 'SET_FAILURE'; txID: string }
  | { type: 'SET_INITIAL_TRANSACTIONS'; transactions: Transaction[] }
  | { type: 'CLEAR_PENDING' }
  | { type: 'CONFIRM_TRANSACTION'; txID: string }
  | { type: 'REMOVE_TRANSACTION'; txID: string }
  | { type: 'SET_BLOCK_NUMBER'; txID: string; blockNumber?: number }
  | { type: 'SET_RESOLVED_TIMESTAMP'; txID: string; timestamp?: string }
  | { type: 'ADD_TRANSACTIONS'; transactions: Transaction[] }
  | {
      type: 'ADD_L1TOL2MSG_TO_DEPOSIT_TRANSACTION'
      txID: string
      l1ToL2Msg: L1ToL2Message
    }

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
  | 'deposit-l2-ticket-created'

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
    case 'deposit-l2-ticket-created':
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
  timestampResolved?: string // time when its status was changed
  timestampCreated?: string //time when this transaction is first added to the list
  seqNum?: number // for l1-initiati
  l1ToL2Msg?: L1ToL2Message
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

function updateStatusAndSeqNum(
  state: Transaction[],
  status: TxnStatus,
  txID: string,
  seqNum?: number
) {
  const newState = [...state]
  const index = newState.findIndex(txn => txn.txID === txID)
  if (index === -1) {
    console.warn('transaction not found', txID)
    return state
  }
  const newTxn = {
    ...newState[index],
    status
  }
  if (seqNum) {
    newTxn.seqNum = seqNum
  }
  newState[index] = newTxn
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
function updateTxnL1ToL2Msg(
  state: Transaction[],
  txID: string,
  l1ToL2Msg: L1ToL2Message
) {
  const newState = [...state]
  const index = newState.findIndex(txn => txn.txID === txID)
  if (index === -1) {
    console.warn('transaction not found', txID)
    return state
  }
  const tx = newState[index]
  if (tx.l1ToL2Msg) {
    console.warn(`l1tol2msg for ${txID} already added`)
    return state
  }

  if (!(tx.type === 'deposit' || tx.type === 'deposit-l1')) {
    throw new Error(
      "Attempting to add a l1tol2msg to a tx that isn't a deposit:" + txID
    )
  }
  newState[index] = {
    ...newState[index],
    l1ToL2Msg
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
      return updateStatusAndSeqNum(state, 'success', action.txID)
    }
    case 'SET_FAILURE': {
      return updateStatusAndSeqNum(state, 'failure', action.txID)
    }
    case 'CLEAR_PENDING': {
      return state.filter(txn => txn.status !== 'pending')
    }
    case 'CONFIRM_TRANSACTION': {
      return updateStatusAndSeqNum(state, 'confirmed', action.txID)
    }
    case 'SET_BLOCK_NUMBER': {
      return updateBlockNumber(state, action.txID, action.blockNumber)
    }
    case 'SET_RESOLVED_TIMESTAMP': {
      return updateResolvedTimestamp(state, action.txID, action.timestamp)
    }
    case 'ADD_L1TOL2MSG_TO_DEPOSIT_TRANSACTION': {
      return updateTxnL1ToL2Msg(state, action.txID, action.l1ToL2Msg)
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
    const tx = {
      ...transaction,
      timestampCreated: new Date().toISOString()
    } as Transaction
    return dispatch({
      type: 'ADD_TRANSACTION',
      transaction: tx
    })
  }
  const addTransactions = (transactions: Transaction[]) => {
    const timestampedTransactoins = transactions.map(txn => {
      return {
        ...txn,
        timestampCreated: new Date().toISOString()
      }
    })
    return dispatch({
      type: 'ADD_TRANSACTIONS',
      transactions: timestampedTransactoins
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

  const addL1ToL2MsgToDepositTxn = (txID: string, l1ToL2Msg: L1ToL2Message) => {
    return dispatch({
      type: 'ADD_L1TOL2MSG_TO_DEPOSIT_TRANSACTION',
      txID: txID,
      l1ToL2Msg
    })
  }

  const removeTransaction = (txID: string) => {
    return dispatch({
      type: 'REMOVE_TRANSACTION',
      txID: txID
    })
  }

  const setTransactionSuccess = (txID: string, seqNum?: number) => {
    return dispatch({
      type: 'SET_SUCCESS',
      txID: txID,
      seqNum: seqNum
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
    tx?: ethers.ContractTransaction,
    seqNum?: number
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
        setTransactionSuccess(txReceipt.transactionHash, seqNum)
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
    if (tx) {
      setResolvedTimestamp(txReceipt.transactionHash, new Date().toISOString())
    }
  }

  return [
    state,
    {
      addTransaction,
      addTransactions,
      setTransactionSuccess,
      setTransactionFailure,
      clearPendingTransactions,
      setTransactionConfirmed,
      updateTransaction,
      removeTransaction,
      addFailedTransaction,
      addL1ToL2MsgToDepositTxn
    }
  ]
}

export default useTransactions
