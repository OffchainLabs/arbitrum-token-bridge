import { useEffect, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { create } from 'zustand'

import { MergedTransaction } from '../../state/app/state'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { TransactionHistorySearchBar } from './TransactionHistorySearchBar'
import { TransactionHistorySearchResults } from './TransactionHistorySearchResults'
import { isTxPending } from './helpers'

function useTransactionHistoryUpdater() {
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

const tabClasses =
  'text-white px-3 mr-2 border-b-2 ui-selected:border-white ui-not-selected:border-transparent ui-not-selected:text-white/80 arb-hover'

type TxDetailsStore = {
  tx: MergedTransaction | null
  isOpen: boolean
  open: (tx: MergedTransaction) => void
  close: () => void
  reset: () => void
}

export const useTxDetailsStore = create<TxDetailsStore>(set => ({
  tx: null,
  isOpen: false,
  open: (tx: MergedTransaction) => {
    set(() => ({
      tx
    }))
    // this is so that we can trigger transition when opening the panel
    setTimeout(() => {
      set(() => ({
        isOpen: true
      }))
    }, 0)
  },
  close: () => set({ isOpen: false }),
  reset: () => set({ tx: null })
}))

export const TransactionHistory = () => {
  useTransactionHistoryUpdater()

  return (
    <div className="m-auto w-full max-w-[100vw] border-y border-white/30 bg-[#191919] py-4 pl-4 md:max-w-[1000px] md:rounded md:border-x md:pr-4">
      <TransactionHistorySearchBar />

      <TransactionHistorySearchResults />
    </div>
  )
}
