import { useAccount } from 'wagmi'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { useEffect, useMemo } from 'react'

import { isTxPending } from './helpers'

export function useTransactionHistoryUpdater() {
  const { address } = useAccount()

  const transactionHistoryProps = useTransactionHistory(address, {
    runFetcher: true
  })

  const { transactions, updatePendingTransaction } = transactionHistoryProps

  const pendingTransactions = useMemo(() => {
    return transactions.filter(isTxPending)
  }, [transactions])

  useEffect(() => {
    const interval = setInterval(() => {
      pendingTransactions.forEach(updatePendingTransaction)
    }, 10_000)

    return () => clearInterval(interval)
  }, [pendingTransactions, updatePendingTransaction])

  return transactionHistoryProps
}
