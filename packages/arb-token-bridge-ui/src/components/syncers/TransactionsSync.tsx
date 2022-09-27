import { useEffect } from 'react'
import useTransactions from 'token-bridge-sdk/dist/hooks/useTransactions'

import { useActions } from '../../state'

// Syncs the Transactions data with the global store, so we dont have to drill with props but use store hooks to get data
export function TransactionsSync(): JSX.Element {
  const actions = useActions()
  const transactionsObject = useTransactions()
  const [transactions, transactionActions] = transactionsObject

  useEffect(() => {
    actions.app.setTransactions({
      transactions,
      ...transactionActions
    })
  }, [actions.app, transactionActions, transactions, transactionsObject])

  return <></>
}
