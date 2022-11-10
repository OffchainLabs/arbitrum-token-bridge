import { useEffect } from 'react'
import { useTransactions } from 'token-bridge-sdk'
import { useActions } from '../state'

export const useTransactionsInApp = () => {
  const {
    app: { setTransactions }
  } = useActions()
  const transactionsObject = useTransactions()
  const [transactions, transactionActions] = transactionsObject

  useEffect(() => {
    setTransactions({
      transactions,
      ...transactionActions
    })
  }, [setTransactions, transactionActions, transactions, transactionsObject])
}
