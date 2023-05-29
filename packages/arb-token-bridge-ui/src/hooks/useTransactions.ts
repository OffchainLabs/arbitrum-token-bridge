import { useMemo, useContext } from 'react'
import {
  isEmpty as _isEmpty,
  reverse as _reverse,
  sortBy as _sortBy
} from 'lodash-es'
import { TransactionReceipt } from '@ethersproject/abstract-provider'
import { BigNumber, ethers } from 'ethers'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'
import dayjs from 'dayjs'
import {
  EthDepositMessage,
  EthDepositStatus,
  L1ToL2MessageReader,
  L1ToL2MessageReaderClassic
} from '@arbitrum/sdk/dist/lib/message/L1ToL2Message'
import { AssetType, L2ToL1EventResultPlus } from './arbTokenBridge.types'
import { TransactionsContext } from '../components/TransactionHistory/TransactionsContext'
import {
  filterTransactions,
  transformDeposits,
  transformWithdrawals
} from '../state/app/utils'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import { useAppState } from '../state'
import { DepositStatus, MergedTransaction } from '../state/app/state'

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
  isClassic?: boolean
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

interface UseTransactions {
  transactions: Transaction[]
  sortedTransactions: Transaction[]
  pendingTransactions: Transaction[]
  l1DepositsWithUntrackedL2Messages: Transaction[]
  failedRetryablesToRedeem: MergedTransaction[]
  depositsTransformed: MergedTransaction[]
  withdrawalsTransformed: MergedTransaction[]
  mergedTransactions: MergedTransaction[]

  addFailedTransaction: (transaction: FailedTransaction) => void

  setDepositsInStore: (transactions: Transaction[]) => void
  setTransactionSuccess: (txID: string) => void
  setTransactionFailure: (txID?: string) => void
  removeTransaction: (txID: string) => void

  addTransaction: (transaction: NewTransaction) => void
  addTransactions: (transactions: Transaction[]) => void
  clearPendingTransactions: () => void
  setTransactionConfirmed: (txID: string) => void
  updateTransaction: (
    txReceipt: TransactionReceipt,
    tx?: ethers.ContractTransaction,
    l1ToL2MsgData?: L1ToL2MessageData
  ) => void
  fetchAndUpdateL1ToL2MsgStatus: (
    txID: string,
    l1ToL2Msg: L1ToL2MessageReader,
    isEthDeposit: boolean,
    status: L1ToL2MessageStatus
  ) => void
  fetchAndUpdateL1ToL2MsgClassicStatus: (
    txID: string,
    l1ToL2Msg: L1ToL2MessageReaderClassic,
    isEthDeposit: boolean,
    status: L1ToL2MessageStatus
  ) => void
  fetchAndUpdateEthDepositMessageStatus: (
    txID: string,
    ethDepositMessage: EthDepositMessage
  ) => void
}

export const useTransactions = (): UseTransactions => {
  const [state, dispatch] = useContext(TransactionsContext)

  const {
    l1: {
      network: { id: l1NetworkChainId }
    },
    l2: {
      network: { id: l2NetworkChainId }
    }
  } = useNetworksAndSigners()

  const {
    app: {
      arbTokenBridge: { walletAddress, pendingWithdrawalsMap }
    }
  } = useAppState()

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
    l1ToL2Msg: L1ToL2MessageReader,
    isEthDeposit: boolean,
    currentStatus: L1ToL2MessageStatus
  ) => {
    // set fetching:
    updateTxnL1ToL2MsgData(txID, {
      fetchingUpdate: true,
      status: currentStatus,
      retryableCreationTxID: l1ToL2Msg.retryableCreationId
    })

    const res = await l1ToL2Msg.getSuccessfulRedeem()

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
  const fetchAndUpdateL1ToL2MsgClassicStatus = async (
    txID: string,
    l1ToL2Msg: L1ToL2MessageReaderClassic,
    isEthDeposit: boolean,
    status: L1ToL2MessageStatus
  ) => {
    const isCompletedEthDeposit =
      isEthDeposit && status >= L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2

    const l2TxID = (() => {
      if (isCompletedEthDeposit) {
        return l1ToL2Msg.retryableCreationId
      }

      if (status === L1ToL2MessageStatus.REDEEMED) {
        return l1ToL2Msg.l2TxHash
      }

      return undefined
    })()

    updateTxnL1ToL2MsgData(txID, {
      status: isCompletedEthDeposit
        ? L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2
        : status,
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
    // appends the state with a new set of transactions
    // useful when you want to display some transactions fetched from subgraph without worrying about existing state

    const transactionsMap: { [id: string]: Transaction } = {}

    ;[...transactions, ...newTransactions].forEach(tx => {
      transactionsMap[tx.txID] = tx
    })

    return dispatch({
      type: 'SET_TRANSACTIONS',
      transactions: Object.values(transactionsMap)
    })
  }

  const transactions = useMemo(() => {
    return state.filter(tx => !deprecatedTxTypes.has(tx.type))
  }, [state])

  const sortedTransactions = useMemo(() => {
    return filterTransactions(
      [...transactions],
      walletAddress,
      l1NetworkChainId,
      l2NetworkChainId
    )
  }, [transactions, walletAddress, l1NetworkChainId, l2NetworkChainId])

  const pendingTransactions = useMemo(() => {
    return sortedTransactions.filter(tx => tx.status === 'pending')
  }, [sortedTransactions])

  const l1DepositsWithUntrackedL2Messages = useMemo(() => {
    // check 'deposit' and 'deposit-l1' for backwards compatibility with old client side cache
    return sortedTransactions.filter(
      (txn: Transaction) =>
        (txn.type === 'deposit' || txn.type === 'deposit-l1') &&
        txn.status === 'success' &&
        (!txn.l1ToL2MsgData ||
          (txn.l1ToL2MsgData.status === L1ToL2MessageStatus.NOT_YET_CREATED &&
            !txn.l1ToL2MsgData.fetchingUpdate))
    )
  }, [sortedTransactions])

  const depositsTransformed = useMemo(() => {
    return transformDeposits(
      sortedTransactions.filter(
        // only take the deposit transactions, rest `outbox`, `approve` etc should not come
        tx => tx.type === 'deposit' || tx.type === 'deposit-l1'
      )
    )
  }, [sortedTransactions])

  const failedRetryablesToRedeem = useMemo(() => {
    return depositsTransformed.filter(
      tx => tx.depositStatus === DepositStatus.L2_FAILURE
    )
  }, [depositsTransformed])

  const withdrawalsTransformed = useMemo(() => {
    const withdrawals = Object.values(
      pendingWithdrawalsMap || []
    ) as L2ToL1EventResultPlus[]

    return transformWithdrawals(withdrawals)
  }, [pendingWithdrawalsMap])

  const mergedTransactions = useMemo(() => {
    return _reverse(
      _sortBy([...depositsTransformed, ...withdrawalsTransformed], item => {
        if (_isEmpty(item.createdAt)) {
          return -1
        }
        return dayjs(item.createdAt).unix() // numeric format
      })
    )
  }, [depositsTransformed, withdrawalsTransformed])

  return {
    // the state and derived values
    transactions,
    sortedTransactions,
    pendingTransactions,
    l1DepositsWithUntrackedL2Messages,
    depositsTransformed,
    failedRetryablesToRedeem,
    withdrawalsTransformed,
    mergedTransactions,

    // state mutating actions
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
    fetchAndUpdateL1ToL2MsgClassicStatus,
    fetchAndUpdateEthDepositMessageStatus
  }
}
