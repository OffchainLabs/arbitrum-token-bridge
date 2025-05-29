import { create } from 'zustand'

import { MergedTransaction } from '../../state/app/state'
import { TransactionHistorySearchBar } from './TransactionHistorySearchBar'
import { TransactionHistorySearchResults } from './TransactionHistorySearchResults'

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
  close: () => set({ isOpen: false, tx: null }),
  reset: () => set({ tx: null })
}))

export const TransactionHistory = () => {
  return (
    <div className="m-auto w-full max-w-[100vw] border-y border-white/30 bg-[#191919] py-4 pl-4 md:max-w-[1000px] md:rounded md:border-x md:pr-4">
      <TransactionHistorySearchBar />

      <TransactionHistorySearchResults />
    </div>
  )
}
