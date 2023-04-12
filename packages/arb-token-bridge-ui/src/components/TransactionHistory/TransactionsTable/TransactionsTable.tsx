import React, { Dispatch, SetStateAction, useMemo } from 'react'
import dayjs from 'dayjs'
import { TransactionsTableDepositRow } from './TransactionsTableDepositRow'
import { TransactionsTableWithdrawalRow } from './TransactionsTableWithdrawalRow'
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'
import {
  getStandardizedDate,
  getStandardizedTime,
  isDeposit,
  isWithdrawal
} from '../../../state/app/utils'
import { MergedTransaction } from '../../../state/app/state'
import { NoDataOverlay } from './NoDataOverlay'
import { TableBodyLoading } from './TableBodyLoading'
import { TableBodyError } from './TableBodyError'
import { TableActionHeader } from './TableActionHeader'
import { useAppState } from '../../../state'

export type PageParams = {
  searchString: string
  pageNumber: number
  pageSize: number
}

export const EmptyTableRow = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {/* Single empty row to set column width */}
      <tr>
        <td className="w-1/5" />
        <td className="w-1/5" />
        <td className="w-1/5" />
        <td className="w-1/5" />
        <td className="w-1/5" />
      </tr>
      <tr>
        <td colSpan={5}>
          <div className="flex h-16 items-center px-6 py-3">{children}</div>
        </td>
      </tr>
    </>
  )
}

export const TransactionDateTime = ({
  standardizedDate
}: {
  standardizedDate: string | null
}) => {
  // Standardized formatted date-time component used across transaction rows

  if (!standardizedDate) return <span className="whitespace-nowrap">n/a</span>
  return (
    <div className="flex flex-nowrap gap-1">
      <span className="whitespace-nowrap">
        {getStandardizedDate(standardizedDate)}
      </span>
      <span className="whitespace-nowrap opacity-60">
        {getStandardizedTime(standardizedDate)}
      </span>
    </div>
  )
}

enum TableStatus {
  LOADING,
  ERROR,
  SUCCESS
}

export type TransactionsTableProps = {
  type: 'deposits' | 'withdrawals'
  pageParams: PageParams
  setPageParams: Dispatch<SetStateAction<PageParams>>
  transactions: MergedTransaction[]
  loading: boolean
  error: boolean
  pendingTransactions: MergedTransaction[]
}

export function TransactionsTable({
  type,
  pageParams,
  setPageParams,
  transactions,
  loading,
  error,
  pendingTransactions
}: TransactionsTableProps) {
  const { isSmartContractWallet } = useNetworksAndSigners()

  const {
    app: { mergedTransactions: locallyStoredTransactions }
  } = useAppState()

  // don't want to update hooks on useAppState reference change. Just the exact value of localTransactions
  const localTransactionsKey = JSON.stringify(locallyStoredTransactions || [])

  // Generating the list of final transactions which will be displayed in the table
  const _transactions: MergedTransaction[] = useMemo(() => {
    // for easier understanding - let's call `transactions` prop as they are - the one's fetched from subgraph.
    const subgraphTransactions = transactions

    // if it is not first page, ignore everything and just show the transactions from subgraph, we assume there are no fresh txns here.
    // or if user has searched for something, ignore appending extra txns ahead of search-results
    if (pageParams.searchString || pageParams.pageNumber > 0)
      return subgraphTransactions

    // else,
    // if it is page 1, and a freshly added transaction has been identified (ie. a txn which is newer than the first subgraph txn in our list),
    // prepend the fresh txn to the start of the list for instant UX, till it starts coming from the subgraph as well (generally after a minute or 2)

    // if there are no transactions from subgraph - our freshly added txns should be the only one's added to the list.
    const noTransactionInSubgraph = subgraphTransactions.length === 0
    const firstSubgraphTransactionTimestamp = noTransactionInSubgraph
      ? dayjs(0) // very old arbitrary date
      : dayjs(subgraphTransactions[0]?.['createdAt'])

    // start identifying newer transactions
    const newerTransactions: MergedTransaction[] = []
    locallyStoredTransactions?.forEach(tx => {
      // only check deposit txns if you're on deposits' tab, and vice-versa
      const isMatchingTab =
        (isDeposit(tx) && type === 'deposits') ||
        (isWithdrawal(tx) && type === 'withdrawals')
      if (!isMatchingTab) return

      // check if the local-state tx is newer than the latest subgraph date
      const pendingTxCreationDate = dayjs(tx.createdAt)
      const isTxAfterSubgraphTxs =
        pendingTxCreationDate.isAfter(firstSubgraphTransactionTimestamp) &&
        tx.createdAt !== subgraphTransactions[0]?.['createdAt']

      if (isTxAfterSubgraphTxs) {
        newerTransactions.push(tx)
      }
    })

    // if newer txns found, append it to the existing subgraph transactions
    return [...newerTransactions.reverse(), ...subgraphTransactions]
  }, [transactions, localTransactionsKey])

  const pendingTransactionsMap = useMemo(() => {
    // map of all the locally-stored pending transactions
    // so that tx rows can easily subscribe to live-local status without refetching table data
    const pendingTxMap = new Map<string, MergedTransaction>()
    pendingTransactions.forEach(tx => {
      pendingTxMap.set(tx.txId, tx)
    })
    return pendingTxMap
  }, [localTransactionsKey])

  const status = (() => {
    if (loading) return TableStatus.LOADING
    if (error) return TableStatus.ERROR
    return TableStatus.SUCCESS
  })()

  const noSearchResults = !!(
    pageParams?.searchString?.length &&
    status === TableStatus.SUCCESS &&
    !transactions?.length
  )

  return (
    <>
      {/* search and pagination buttons */}
      <TableActionHeader
        type={type}
        pageParams={pageParams}
        setPageParams={setPageParams}
        transactions={transactions}
        loading={loading}
      />

      {
        <table className="w-full overflow-hidden  rounded-b-lg bg-white">
          <thead className="text-left text-sm text-gray-10">
            <tr>
              <th className="py-3 pl-6 pr-3 font-normal">Status</th>
              <th className="px-3 py-3 font-normal">Time</th>
              <th className="px-3 py-3 font-normal">Amount</th>
              <th className="px-3 py-3 font-normal">TxID</th>
              <th className="py-3 pl-3 pr-6 font-normal">
                {/* Empty header text */}
              </th>
            </tr>
          </thead>

          <tbody>
            {status === TableStatus.LOADING && <TableBodyLoading />}

            {status === TableStatus.ERROR && <TableBodyError />}

            {/* when there are no search results found */}
            {status === TableStatus.SUCCESS && noSearchResults && (
              <NoDataOverlay />
            )}

            {/* when there are no transactions present */}
            {status === TableStatus.SUCCESS &&
              !noSearchResults &&
              !_transactions.length && (
                <EmptyTableRow>
                  <span className="text-sm font-medium">
                    {isSmartContractWallet
                      ? 'You can see tx history in your smart contract wallet'
                      : 'No transactions'}
                  </span>
                </EmptyTableRow>
              )}

            {/* finally, when transactions are present, show rows */}
            {status === TableStatus.SUCCESS &&
              !noSearchResults &&
              _transactions.map((tx, index) => {
                const isLastRow = index === _transactions.length - 1

                // if transaction is present in pending transactions, subscribe to that in this row,
                // this will make sure the row updates with any updates in the pending tx state
                // else show static subgraph table data
                const pendingTransaction = pendingTransactionsMap.get(tx.txId)
                const finalTx = pendingTransaction ? pendingTransaction : tx

                if (isDeposit(finalTx)) {
                  return (
                    <TransactionsTableDepositRow
                      key={`${finalTx.txId}-${finalTx.direction}`}
                      tx={finalTx}
                      className={!isLastRow ? 'border-b border-gray-5' : ''}
                    />
                  )
                } else if (isWithdrawal(finalTx)) {
                  return (
                    <TransactionsTableWithdrawalRow
                      key={`${finalTx.txId}-${finalTx.direction}`}
                      tx={finalTx}
                      className={!isLastRow ? 'border-b border-gray-5' : ''}
                    />
                  )
                } else {
                  return null
                }
              })}
          </tbody>
        </table>
      }
    </>
  )
}
