import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { LifiMergedTransaction } from '../state/app/state'

interface LifiMergedTransactionCacheState {
  transactions: Record<string, LifiMergedTransaction[]>
  addTransaction: (tx: LifiMergedTransaction) => void
}
export const useLifiMergedTransactionCacheStore =
  create<LifiMergedTransactionCacheState>()(
    persist(
      set => ({
        transactions: {},
        addTransaction: tx => {
          const sender = tx.sender
          if (!sender) {
            return
          }
          set(state => ({
            transactions: {
              [sender]: [tx].concat(state.transactions[sender] || []),
              // If transaction is sent to a custom destination address, make sure it's registered for that account too
              ...(tx.destination && tx.destination !== sender
                ? {
                    [tx.destination]: [tx].concat(
                      state.transactions[tx.destination] || []
                    )
                  }
                : {})
            }
          }))
        }
      }),
      {
        name: 'lifi-merged-transaction-cache',
        version: 1
      }
    )
  )
