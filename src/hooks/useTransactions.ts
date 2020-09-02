import React, { useReducer, useEffect } from 'react'
import { AssetType } from './useArbTokenBridge'

type Action =
  | { type: 'ADD_TRANSACTION'; transaction: Transaction }
  | { type: 'SET_SUCCESS'; txID: string }
  | { type: 'SET_FAILURE'; txID: string }
  | { type: 'SET_INITIAL_TRANSACTIONS'; transactions: Transaction[] }
  | { type: 'CLEAR_PENDING' }
  | { type: 'CONFIRM_TRANSACTION', txID: string }
export type TxnStatus = 'pending' | 'success' | 'failure' | 'confirmed'

export type Transaction = {
  type: 'deposit' | 'withdraw' | 'lockbox' | 'approve'
  status: TxnStatus
  value: string | null
  txID: string
  assetName: string
  assetType: AssetType
  sender: string
}

interface NewTransaction extends Transaction {
  status: 'pending'
}

function updateStatus(state:Transaction[], status: TxnStatus, txID: string){
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
function reducer(state: Transaction[], action: Action) {
  switch (action.type) {
    case 'SET_INITIAL_TRANSACTIONS': {
      return [...action.transactions]
    }
    case 'ADD_TRANSACTION': {
      return state.concat(action.transaction)
    }
    case 'SET_SUCCESS': {
      return updateStatus(state, 'success', action.txID);
    }
    case 'SET_FAILURE': {
      return updateStatus(state, 'failure', action.txID);
    }
    case 'CLEAR_PENDING': {
      return state.filter(txn => txn.status !== 'pending')
    }
    case 'CONFIRM_TRANSACTION':{
      return updateStatus(state, 'confirmed', action.txID);
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
const useTransactions = (): [Transaction[], any] => {
  const [state, dispatch] = useReducer(localStorageReducer, [])
  useEffect(() => {
    const cachedTransactions = window.localStorage.getItem('arbTransactions')
    dispatch({
      type: 'SET_INITIAL_TRANSACTIONS',
      transactions: cachedTransactions ? JSON.parse(cachedTransactions) : []
    })
  }, [])

  const addTransaction = (transaction: NewTransaction) => {
    return dispatch({
      type: 'ADD_TRANSACTION',
      transaction
    })
  }
  const setTransactionSuccess = (txID: string) => {
    return dispatch({
      type: 'SET_SUCCESS',
      txID: txID
    })
  }
  const setTransactionFailure = (txID: string) => {
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
  return [
    state,
    {
      addTransaction,
      setTransactionSuccess,
      setTransactionFailure,
      clearPendingTransactions
    }
  ]
}

export default useTransactions
