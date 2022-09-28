import { useEffect } from 'react'
import useTransactions from 'token-bridge-sdk/dist/hooks/useTransactions'

import { useActions } from '../../state'

// Syncs the Transactions data with the global store, so we dont have to drill with props but use store hooks to get data
export function TransactionsSync(): JSX.Element {
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

  return <></>
}
