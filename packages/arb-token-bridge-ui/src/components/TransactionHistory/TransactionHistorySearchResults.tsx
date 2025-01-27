import dayjs from 'dayjs'
import { useEffect, useMemo } from 'react'
import { Tab } from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

import { MergedTransaction } from '../../state/app/state'
import {
  ContentWrapper,
  TransactionHistoryTable
} from './TransactionHistoryTable'
import {
  TransactionHistoryStatusBar,
  TransactionStatusInfo
} from '../TransactionHistory/TransactionStatusInfo'
import {
  isTxClaimable,
  isTxCompleted,
  isTxExpired,
  isTxFailed,
  isTxPending
} from './helpers'
import { TabButton } from '../common/Tab'
import { TransactionsTableDetails } from './TransactionsTableDetails'
import {
  ChainPair,
  useTransactionHistory
} from '../../hooks/useTransactionHistory'
import { useTransactionHistoryAddressStore } from './TransactionHistorySearchBar'
import { Tooltip } from '../common/Tooltip'
import { getNetworkName } from '../../util/networks'

function useTransactionHistoryUpdater() {
  const { sanitizedAddress } = useTransactionHistoryAddressStore()

  const transactionHistoryProps = useTransactionHistory(sanitizedAddress, {
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

const FailedChainPairsStatusBar = ({
  failedChainPairs
}: {
  failedChainPairs: ChainPair[]
}) => {
  if (failedChainPairs.length === 0) {
    return null
  }

  return (
    <TransactionHistoryStatusBar wrapperClassName="flex space-x-1 bg-error">
      <div className="flex space-x-2">
        <ExclamationTriangleIcon width={20} />
        <span>
          We were unable to fetch data for the some chains. You can see the full
          list{' '}
        </span>
      </div>
      <Tooltip
        theme="dark"
        content={
          <div className="flex flex-col space-y-1 text-xs">
            <span>
              We were unable to fetch data for the following chain pairs:
            </span>
            <ul className="flex list-disc flex-col pl-4">
              {failedChainPairs.map(pair => (
                <li key={`${pair.parentChainId}-${pair.childChainId}`}>
                  <b>{getNetworkName(pair.parentChainId)}</b>
                  {' <> '}
                  <b>{getNetworkName(pair.childChainId)}</b>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <b className="cursor-pointer underline">here.</b>
      </Tooltip>
    </TransactionHistoryStatusBar>
  )
}

export function TransactionHistorySearchResults() {
  const props = useTransactionHistoryUpdater()
  const { transactions, failedChainPairs } = props
  const { searchError } = useTransactionHistoryAddressStore()

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

  if (searchError) {
    return (
      <ContentWrapper>
        <p>{searchError}</p>
      </ContentWrapper>
    )
  }

  return (
    <>
      <div className="pr-4 md:pr-0">
        <TransactionStatusInfo />
        <FailedChainPairsStatusBar failedChainPairs={failedChainPairs} />
      </div>
      <Tab.Group as="div" className="h-full overflow-hidden rounded md:pr-0">
        <Tab.List className="mb-4 flex border-b border-white/30">
          <TabButton
            aria-label="show pending transactions"
            className={tabClasses}
          >
            <span className="text-sm md:text-base">Pending transactions</span>
          </TabButton>
          <TabButton
            aria-label="show settled transactions"
            className={tabClasses}
          >
            <span className="text-sm md:text-base">Settled transactions</span>
          </TabButton>
        </Tab.List>

        <Tab.Panels className="h-full w-full overflow-hidden">
          <Tab.Panel className="h-full w-full">
            <TransactionHistoryTable
              {...props}
              transactions={pendingTransactions}
              selectedTabIndex={0}
              oldestTxTimeAgoString={oldestTxTimeAgoString}
            />
          </Tab.Panel>
          <Tab.Panel className="h-full w-full">
            <TransactionHistoryTable
              {...props}
              transactions={settledTransactions}
              selectedTabIndex={1}
              oldestTxTimeAgoString={oldestTxTimeAgoString}
            />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
      <TransactionsTableDetails />
    </>
  )
}
