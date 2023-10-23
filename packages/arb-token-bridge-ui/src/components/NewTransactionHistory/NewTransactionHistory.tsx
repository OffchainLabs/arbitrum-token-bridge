import { Tab } from '@headlessui/react'
import { useAccount } from 'wagmi'

import { useCompleteMultiChainTransactions } from '../../hooks/useCompleteMultiChainTransactions'
import { TransactionHistoryTable } from './TransactionHistoryTable'
import {
  isTxClaimable,
  isTxCompleted,
  isTxExpired,
  isTxFailed,
  isTxPending
} from './helpers'
import { MergedTransaction } from '../../state/app/state'
import { PropsWithChildren, useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

export const NewTransactionHistory = () => {
  const { address } = useAccount()

  const {
    data: { transactions, total },
    loading,
    completed,
    paused
  } = useCompleteMultiChainTransactions()

  const groupedTransactions = useMemo(
    () =>
      transactions.reduce(
        (acc, tx) => {
          if (isTxCompleted(tx)) {
            acc.settled.push(tx)
            return acc
          }
          if (isTxPending(tx)) {
            acc.pending.push(tx)
            return acc
          }
          if (isTxClaimable(tx)) {
            acc.claimable.push(tx)
            return acc
          }
          if (isTxFailed(tx)) {
            acc.failed.push(tx)
            return acc
          }
          if (isTxExpired(tx)) {
            acc.expired.push(tx)
            return acc
          }
          return acc
        },
        {
          settled: [] as MergedTransaction[],
          pending: [] as MergedTransaction[],
          claimable: [] as MergedTransaction[],
          failed: [] as MergedTransaction[],
          expired: [] as MergedTransaction[]
        }
      ),
    [transactions]
  )

  const TabButton = ({
    children,
    selected
  }: PropsWithChildren<{ selected: boolean }>) => {
    return (
      <button
        className={twMerge(
          'px-4 text-lg transition-all',
          selected ? 'border-b-2 border-white font-normal' : 'font-extralight'
        )}
      >
        {children}
      </button>
    )
  }

  return (
    <Tab.Group key={address} as="div" className="h-full overflow-hidden pb-28">
      <Tab.List className="border-b border-gray-500 text-white">
        <Tab>
          {({ selected }) => (
            <TabButton selected={selected}>Pending transactions</TabButton>
          )}
        </Tab>
        <Tab>
          {({ selected }) => (
            <TabButton selected={selected}>Settled transactions</TabButton>
          )}
        </Tab>
      </Tab.List>

      <Tab.Panels className="mt-4 h-full overflow-auto">
        <Tab.Panel className="h-full">
          <TransactionHistoryTable
            transactions={[
              ...groupedTransactions.pending,
              ...groupedTransactions.expired,
              ...groupedTransactions.failed,
              ...groupedTransactions.claimable
            ]}
            txCount={total}
            loading={loading}
            type="pending"
          />
        </Tab.Panel>
        <Tab.Panel className="h-full">
          <TransactionHistoryTable
            transactions={groupedTransactions.settled}
            txCount={total}
            loading={loading}
            type="settled"
          />
        </Tab.Panel>
      </Tab.Panels>
    </Tab.Group>
  )
}
