import dayjs from 'dayjs'
import { useMemo } from 'react'
import { Tab } from '@headlessui/react'

import { UseTransactionHistoryResult } from '../../hooks/useTransactionHistory'
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

const tabClasses =
  'text-white px-3 mr-2 ui-selected:border-b-2 ui-selected:border-white ui-not-selected:text-white/80'

export const TransactionHistory = ({
  props
}: {
  props: UseTransactionHistoryResult & { address: `0x${string}` | undefined }
}) => {
  const {
    transactions,
    address,
    loading,
    completed,
    error,
    failedChainPairs,
    resume
  } = props

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
      <Tab.List className="mb-4 flex border-b border-white/30">
        <TabButton
          aria-label="show pending transactions"
          className={tabClasses}
        >
          <span className="text-xs md:text-base">Pending transactions</span>
        </TabButton>
        <TabButton
          aria-label="show settled transactions"
          className={tabClasses}
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
            selectedTabIndex={1}
            oldestTxTimeAgoString={oldestTxTimeAgoString}
          />
        </Tab.Panel>
      </Tab.Panels>
    </Tab.Group>
  )
}
