import dayjs from 'dayjs'
import { useEffect, useMemo } from 'react'
import { Tab } from '@headlessui/react'
import { twMerge } from 'tailwind-merge'
import { useAccount } from 'wagmi'

import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { TransactionHistoryTable } from './TransactionHistoryTable'
import {
  isTxClaimable,
  isTxCompleted,
  isTxExpired,
  isTxFailed,
  isTxPending
} from './helpers'
import { MergedTransaction } from '../../state/app/state'
import { TabButton } from '../common/Tab'

const roundedTabClasses =
  'roundedTab ui-not-selected:arb-hover relative flex flex-row flex-nowrap items-center gap-0.5 md:gap-2 rounded-tl-lg rounded-tr-lg px-2 md:px-4 py-2 text-base ui-selected:bg-white ui-not-selected:text-white justify-center md:justify-start grow md:grow-0'

export const TransactionHistory = () => {
  const { address } = useAccount()
  const {
    transactions,
    updatePendingTransaction,
    loading,
    completed,
    error,
    failedChainPairs,
    resume
  } = useTransactionHistory(address, {
    runFetcher: true
  })

  const _pendingTransactions = useMemo(() => {
    return transactions.filter(isTxPending)
  }, [transactions])

  useEffect(() => {
    const interval = setInterval(() => {
      _pendingTransactions.forEach(updatePendingTransaction)
    }, 10_000)

    return () => clearInterval(interval)
  }, [_pendingTransactions, updatePendingTransaction])

  const oldestTxTimeAgoString = useMemo(() => {
    return dayjs(transactions[transactions.length - 1]?.createdAt).toNow(true)
  }, [transactions])

  const groupedTransactions = useMemo(
    () =>
      transactions.reduce(
        (acc, tx) => {
          if (isTxCompleted(tx) || isTxExpired(tx)) {
            acc.settled.push(tx)
          }
          if (isTxPending(tx)) {
            acc.pending.push(tx)
          }
          if (isTxClaimable(tx)) {
            acc.claimable.push(tx)
          }
          if (isTxFailed(tx)) {
            acc.failed.push(tx)
          }
          return acc
        },
        {
          settled: [] as MergedTransaction[],
          pending: [] as MergedTransaction[],
          claimable: [] as MergedTransaction[],
          failed: [] as MergedTransaction[]
        }
      ),
    [transactions]
  )

  const pendingTransactions = [
    ...groupedTransactions.failed,
    ...groupedTransactions.pending,
    ...groupedTransactions.claimable
  ]

  const settledTransactions = groupedTransactions.settled

  return (
    <Tab.Group key={address} as="div" className="h-full overflow-hidden">
      <Tab.List className="flex">
        <TabButton
          aria-label="show pending transactions"
          className={twMerge(roundedTabClasses, 'roundedTabRight')}
        >
          <span className="text-xs md:text-base">Pending transactions</span>
        </TabButton>
        <TabButton
          aria-label="show settled transactions"
          className={twMerge(
            roundedTabClasses,
            'roundedTabLeft roundedTabRight'
          )}
        >
          <span className="text-xs md:text-base">Settled transactions</span>
        </TabButton>
      </Tab.List>

      <Tab.Panels className="h-full overflow-hidden">
        <Tab.Panel className="h-full">
          <TransactionHistoryTable
            transactions={pendingTransactions}
            loading={loading}
            completed={completed}
            error={error}
            failedChainPairs={failedChainPairs}
            resume={resume}
            rowHeight={94}
            rowHeightCustomDestinationAddress={130}
            selectedTabIndex={0}
            oldestTxTimeAgoString={oldestTxTimeAgoString}
          />
        </Tab.Panel>
        <Tab.Panel className="h-full">
          <TransactionHistoryTable
            transactions={settledTransactions}
            loading={loading}
            completed={completed}
            error={error}
            failedChainPairs={failedChainPairs}
            resume={resume}
            rowHeight={85}
            rowHeightCustomDestinationAddress={117}
            selectedTabIndex={1}
            oldestTxTimeAgoString={oldestTxTimeAgoString}
          />
        </Tab.Panel>
      </Tab.Panels>
    </Tab.Group>
  )
}
