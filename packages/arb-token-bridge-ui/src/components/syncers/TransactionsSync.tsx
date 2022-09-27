import { useEffect } from 'react'
import { TransactionActions } from 'token-bridge-sdk/dist/hooks/arbTokenBridge.types'
import useTransactions, {
  Transaction
} from 'token-bridge-sdk/dist/hooks/useTransactions'

import { useActions } from '../../state'

export type AppStateTransactions = {
  transactions: Transaction[]
} & Pick<
  TransactionActions,
  | 'addTransaction'
  | 'addTransactions'
  | 'setTransactionSuccess'
  | 'setTransactionFailure'
  | 'clearPendingTransactions'
  | 'setTransactionConfirmed'
  | 'updateTransaction'
  | 'removeTransaction'
  | 'addFailedTransaction'
  | 'fetchAndUpdateL1ToL2MsgStatus'
  | 'fetchAndUpdateEthDepositMessageStatus'
>

// Syncs the arbTokenBridge data with the global store, so we dont have to drill with props but use store hooks to get data
export function TransactionsSync(): JSX.Element {
  const actions = useActions()
  const [
    transactions,
    {
      addTransaction,
      addTransactions,
      setTransactionFailure,
      clearPendingTransactions,
      setTransactionConfirmed,
      setTransactionSuccess,
      updateTransaction,
      removeTransaction,
      addFailedTransaction,
      fetchAndUpdateL1ToL2MsgStatus,
      fetchAndUpdateEthDepositMessageStatus
    }
  ] = useTransactions()

  useEffect(() => {
    actions.app.setTransactions({
      transactions,
      addTransaction,
      addTransactions,
      setTransactionFailure,
      clearPendingTransactions,
      setTransactionConfirmed,
      setTransactionSuccess,
      updateTransaction,
      removeTransaction,
      addFailedTransaction,
      fetchAndUpdateL1ToL2MsgStatus,
      fetchAndUpdateEthDepositMessageStatus
    })
  }, [])

  return <></>
}
