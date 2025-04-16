import { useMemo } from 'react'

import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { isTxClaimable, isTxPending } from './helpers'
import { isDepositReadyToRedeem } from '../../state/app/utils'
import { useTransactionHistoryAddressStore } from './TransactionHistorySearchBar'

export function useTransactionReminderInfo() {
  const sanitizedAddress = useTransactionHistoryAddressStore(
    state => state.sanitizedAddress
  )
  const { transactions } = useTransactionHistory(sanitizedAddress)

  const {
    numClaimableTransactions,
    numRetryablesToRedeem,
    numPendingTransactions
  } = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        // standard bridge withdrawal
        if (isTxClaimable(tx)) {
          acc.numClaimableTransactions += 1
        }
        // failed retryable
        if (isDepositReadyToRedeem(tx)) {
          acc.numRetryablesToRedeem += 1
        }
        // all pending
        if (isTxPending(tx)) {
          acc.numPendingTransactions += 1
        }
        return acc
      },
      {
        numClaimableTransactions: 0,
        numRetryablesToRedeem: 0,
        numPendingTransactions: 0
      }
    )
  }, [transactions])

  const colorClassName = useMemo(() => {
    if (numRetryablesToRedeem > 0) {
      return { dark: 'bg-red-700', light: 'bg-retry' }
    }
    if (numClaimableTransactions > 0) {
      return { dark: 'bg-lime-dark', light: 'bg-claim' }
    }
    if (numPendingTransactions > 0) {
      return { dark: 'bg-cyan-dark', light: 'bg-pending' }
    }
    return { dark: 'bg-gray-1 text-white/70', light: '' }
  }, [numClaimableTransactions, numPendingTransactions, numRetryablesToRedeem])

  return {
    numClaimableTransactions,
    numRetryablesToRedeem,
    numPendingTransactions,
    colorClassName
  }
}
