import { useReducer, useEffect, useMemo } from 'react'
import { TransactionReceipt } from '@ethersproject/abstract-provider'
import { AssetType, TransactionActions } from './arbTokenBridge.types'
import { BigNumber, ethers } from 'ethers'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'
import {
  EthDepositMessage,
  EthDepositStatus,
  L1ToL2MessageReader as IL1ToL2MessageReader
} from '@arbitrum/sdk/dist/lib/message/L1ToL2Message'

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

export interface L1ToL2MessageData {
  status: L1ToL2MessageStatus
  retryableCreationTxID: string
  l2TxID?: string
  fetchingUpdate: boolean
}

export type L2ToL1MessageData = {
  uniqueId: BigNumber
}

type TransactionBase = {
  type: TxnType
  status: TxnStatus
  value: string | null
  txID?: string
  assetName: string
  assetType: AssetType
  tokenAddress?: string
  sender: string
  blockNumber?: number
  l1NetworkID: string
  l2NetworkID?: string
  timestampResolved?: string // time when its status was changed
  timestampCreated?: string //time when this transaction is first added to the list
  l1ToL2MsgData?: L1ToL2MessageData
  l2ToL1MsgData?: L2ToL1MessageData
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

// TODO: enforce this type restriction
export interface DepositTransaction extends Transaction {
  l1ToL2MsgData: L1ToL2MessageData
  type: 'deposit' | 'deposit-l1'
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

const localStorageReducer = (state: Transaction[], action: Action) => {
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
    const timestampedTransactions = transactions.map(txn => {
      return {
        ...txn,
        timestampCreated: new Date().toISOString()
      }
    })
    return dispatch({
      type: 'ADD_TRANSACTIONS',
      transactions: timestampedTransactions
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

  const updateTxnL1ToL2MsgData = async (
    txID: string,
    l1ToL2MsgData: L1ToL2MessageData
  ) => {
    dispatch({
      type: 'UPDATE_L1TOL2MSG_DATA',
      txID: txID,
      l1ToL2MsgData
    })
  }

  const fetchAndUpdateEthDepositMessageStatus = async (
    txID: string,
    ethDepositMessage: EthDepositMessage
  ) => {
    updateTxnL1ToL2MsgData(txID, {
      fetchingUpdate: true,
      status: L1ToL2MessageStatus.NOT_YET_CREATED,
      retryableCreationTxID: ethDepositMessage.l2DepositTxHash
    })

    const status = await ethDepositMessage.status()
    const isDeposited = status === EthDepositStatus.DEPOSITED

    updateTxnL1ToL2MsgData(txID, {
      fetchingUpdate: false,
      status: isDeposited
        ? L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2
        : L1ToL2MessageStatus.NOT_YET_CREATED,
      retryableCreationTxID: ethDepositMessage.l2DepositTxHash,
      // Only show `l2TxID` after the deposit is confirmed
      l2TxID: isDeposited ? ethDepositMessage.l2DepositTxHash : undefined
    })
  }

  const fetchAndUpdateL1ToL2MsgStatus = async (
    txID: string,
    l1ToL2Msg: IL1ToL2MessageReader,
    isEthDeposit: boolean,
    currentStatus: L1ToL2MessageStatus
  ) => {
    // set fetching:
    updateTxnL1ToL2MsgData(txID, {
      fetchingUpdate: true,
      status: currentStatus,
      retryableCreationTxID: l1ToL2Msg.retryableCreationId
    })

    const res = await l1ToL2Msg.waitForStatus()

    const l2TxID = (() => {
      if (res.status === L1ToL2MessageStatus.REDEEMED) {
        return res.l2TxReceipt.transactionHash
      } else if (
        res.status === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2 &&
        isEthDeposit
      ) {
        return l1ToL2Msg.retryableCreationId /** for completed eth deposits, retryableCreationId is the l2txid */
      } else {
        return undefined
      }
    })()

    updateTxnL1ToL2MsgData(txID, {
      status: res.status,
      l2TxID,
      fetchingUpdate: false,
      retryableCreationTxID: l1ToL2Msg.retryableCreationId
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
    l1ToL2MsgData?: L1ToL2MessageData
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
    if (tx) {
      setResolvedTimestamp(txReceipt.transactionHash, new Date().toISOString())
    }
    if (l1ToL2MsgData) {
      updateTxnL1ToL2MsgData(txReceipt.transactionHash, l1ToL2MsgData)
    }
  }

  const setDepositsInStore = (newTransactions: Transaction[]) => {
    // RESETS the state with a new set of transactions
    // useful when you want to display some transactions fetched from subgraph without worrying about existing state

    return dispatch({
      type: 'SET_TRANSACTIONS',
      transactions: newTransactions
    })
  }

  const transactions = useMemo(() => {
    return state.filter(tx => !deprecatedTxTypes.has(tx.type))
  }, [state])

  return [
    transactions,
    {
      addTransaction,
      addTransactions,
      setDepositsInStore,
      setTransactionSuccess,
      setTransactionFailure,
      clearPendingTransactions,
      setTransactionConfirmed,
      updateTransaction,
      removeTransaction,
      addFailedTransaction,
      fetchAndUpdateL1ToL2MsgStatus,
      fetchAndUpdateEthDepositMessageStatus
    }
  ]
}

export default useTransactions
