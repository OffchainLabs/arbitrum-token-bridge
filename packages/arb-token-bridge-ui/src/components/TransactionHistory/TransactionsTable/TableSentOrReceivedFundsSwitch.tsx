import { useMemo } from 'react'

import { useAppContextActions, useAppContextState } from '../../App/AppContext'
import { TransactionsTableSwitch } from './TransactionsTableSwitch'

export const TableSentOrReceivedFundsSwitch = ({
  className
}: {
  className: string
}) => {
  const {
    layout: { isTransactionHistoryShowingSentTx }
  } = useAppContextState()
  const { showSentTransactions, showReceivedTransactions } =
    useAppContextActions()

  const tabs = useMemo(() => {
    return [
      {
        handleClick: () => showSentTransactions(),
        text: 'Funds Sent',
        isActive: isTransactionHistoryShowingSentTx
      },
      {
        handleClick: () => showReceivedTransactions(),
        text: 'Funds Received',
        isActive: !isTransactionHistoryShowingSentTx
      }
    ]
  }, [
    isTransactionHistoryShowingSentTx,
    showReceivedTransactions,
    showSentTransactions
  ])

  return <TransactionsTableSwitch className={className} tabs={tabs} />
}
