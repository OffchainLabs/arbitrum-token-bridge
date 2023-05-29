import React, { Dispatch, useEffect, useReducer } from 'react'
import {
  L1ToL2MessageData,
  Transaction,
  TxnStatus
} from '../../hooks/useTransactions'

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
      type: 'UPDATE_L1TOL2MSG_DATA'
      txID: string
      l1ToL2MsgData: L1ToL2MessageData
    }
  | { type: 'SET_TRANSACTIONS'; transactions: Transaction[] }

type TransactionsContextState = Transaction[]

export type TransactionsContextValue = [
  TransactionsContextState,
  Dispatch<Action>
]

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

function updateTxnL1ToL2Msg(
  state: Transaction[],
  txID: string,
  l1ToL2MsgData: L1ToL2MessageData
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
      "Attempting to add a l1tol2msg to a tx that isn't a deposit:" + txID
    )
  }

  const previousL1ToL2MsgData = transaction.l1ToL2MsgData
  if (!previousL1ToL2MsgData) {
    newState[index] = {
      ...transaction,
      l1ToL2MsgData: {
        status: l1ToL2MsgData.status,
        retryableCreationTxID: l1ToL2MsgData.retryableCreationTxID,
        fetchingUpdate: false
      }
    }
    return newState
  }

  newState[index] = {
    ...transaction,
    l1ToL2MsgData: { ...previousL1ToL2MsgData, ...l1ToL2MsgData }
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
    case 'UPDATE_L1TOL2MSG_DATA': {
      return updateTxnL1ToL2Msg(state, action.txID, action.l1ToL2MsgData)
    }
    case 'SET_TRANSACTIONS': {
      return action.transactions
    }
    default:
      return state
  }
}

export const localStorageReducer = (state: Transaction[], action: Action) => {
  const newState = reducer(state, action)
  // don't cache fetchingUpdate state
  const stateForCache = newState.map(tx => {
    if (tx.l1ToL2MsgData && tx.l1ToL2MsgData.fetchingUpdate) {
      return {
        ...tx,
        l1ToL2MsgData: {
          ...tx.l1ToL2MsgData,
          fetchingUpdate: false
        }
      }
    }
    return tx
  })
  window.localStorage.setItem('arbTransactions', JSON.stringify(stateForCache))
  return newState
}

const initialState = [] as TransactionsContextState

// Create the context
export const TransactionsContext =
  React.createContext<TransactionsContextValue>([initialState, () => ({})])

// Provider
export const TransactionsContextProvider = ({
  children
}: {
  children: React.ReactNode
}) => {
  const [state, dispatch] = useReducer(localStorageReducer, [])

  // for the first time, set the transactions from local storage
  useEffect(() => {
    const cachedTransactions = window.localStorage.getItem('arbTransactions')
    dispatch({
      type: 'SET_INITIAL_TRANSACTIONS',
      transactions: cachedTransactions ? JSON.parse(cachedTransactions) : []
    })
  }, [])

  return (
    <TransactionsContext.Provider value={[state, dispatch]}>
      {children}
    </TransactionsContext.Provider>
  )
}
