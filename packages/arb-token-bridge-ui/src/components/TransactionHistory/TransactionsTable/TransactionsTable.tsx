import React, { Dispatch, SetStateAction, useMemo } from 'react'
import dayjs from 'dayjs'
import { TransactionsTableDepositRow } from './TransactionsTableDepositRow'
import { TransactionsTableWithdrawalRow } from './TransactionsTableWithdrawalRow'
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'
import {
  getStandardisedDate,
  getStandardisedTime,
  isDeposit,
  isPending
} from '../../../state/app/utils'
import { MergedTransaction } from '../../../state/app/state'
import { NoDataOverlay } from './NoDataOverlay'
import { TableBodyLoading } from './TableBodyLoading'
import { TableBodyError } from './TableBodyError'
import { TableActionHeader } from './TableActionHeader'

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
          <div className="flex h-16 items-center py-3 px-6">{children}</div>
        </td>
      </tr>
    </>
  )
}

export const TransactionDateTime = ({
  standardisedDate
}: {
  standardisedDate: string | null
}) => {
  // Standardised formatted date-time component used across transaction rows

  if (!standardisedDate) return <span className="whitespace-nowrap">n/a</span>
  return (
    <div className="flex flex-nowrap gap-1">
      <span className="whitespace-nowrap">
        {getStandardisedDate(standardisedDate)}
      </span>
      <span className="whitespace-nowrap opacity-60">
        {getStandardisedTime(standardisedDate)}
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
  localCachedTransactionMap: Map<string, MergedTransaction>
}

export function TransactionsTable({
  type,
  pageParams,
  setPageParams,
  transactions,
  loading,
  error,
  localCachedTransactionMap
}: TransactionsTableProps) {
  const { isSmartContractWallet } = useNetworksAndSigners()

  const _transactions: MergedTransaction[] = useMemo(() => {
    // if it is page 1, and a newly added transaction has come in (from local-storage)
    // prepend that to the start of the list, till it starts coming from the subgraph as well (generally after a minute or 2)

    // if first page
    if (!pageParams.pageNumber) {
      const noTransactionInSubgraph = !transactions?.[0]
      const firstSubgraphTransactionTimestamp = noTransactionInSubgraph
        ? dayjs(0) // very old arbitrary date
        : dayjs(transactions[0]?.['createdAt'])

      const newerTransactions: MergedTransaction[] = []

      localCachedTransactionMap?.forEach(tx => {
        // only check pending deposits if you're on deposits, and vice-versa
        const isMatchingPage =
          (isDeposit(tx) && type === 'deposits') ||
          (!isDeposit(tx) && type !== 'deposits')
        if (!isMatchingPage) return

        // check if the pending tx is newer than the latest subgraph date
        const pendingTxCreationDate = dayjs(tx.createdAt)
        const isTxAfterSubgraphTxs =
          pendingTxCreationDate.isAfter(firstSubgraphTransactionTimestamp) &&
          tx.createdAt !== transactions[0]?.['createdAt']

        if (isTxAfterSubgraphTxs) {
          newerTransactions.push(tx)
        }
      })

      // if newer txns found, append it to the existing subgraph transactions
      return [...newerTransactions, ...transactions]
    }

    return transactions
  }, [transactions, localCachedTransactionMap])

  const status = useMemo(() => {
    if (loading) return TableStatus.LOADING
    if (error) return TableStatus.ERROR
    return TableStatus.SUCCESS
  }, [loading, error])

  const noSearchResults =
    pageParams?.searchString?.length &&
    status === TableStatus.SUCCESS &&
    !transactions?.length

  return (
    <>
      {/* search and pagination buttons */}
      <TableActionHeader
        {...{
          type,
          pageParams,
          setPageParams,
          transactions,
          loading,
          error,
          localCachedTransactionMap
        }}
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
            {status === TableStatus.LOADING ? <TableBodyLoading /> : null}

            {status === TableStatus.ERROR ? <TableBodyError /> : null}

            {/* when there are no search results found */}
            {status === TableStatus.SUCCESS && noSearchResults ? (
              <NoDataOverlay />
            ) : null}

            {status === TableStatus.SUCCESS && !noSearchResults ? (
              <>
                {_transactions.length > 0 ? (
                  _transactions.map((tx, index) => {
                    const isLastRow = index === _transactions.length - 1

                    const locallyCachedTx = localCachedTransactionMap.get(
                      tx.txId
                    )

                    // if transaction is present in pending transactions, subscribe to that in this row,
                    // this will make sure the row updates with any updates in the pending tx state
                    // else show static subgraph table data

                    const finalTx: MergedTransaction = (() => {
                      //if transaction not present in subgraph, but present in local-cache
                      // example - in our `readClassicDeposit` test - where we are not relying at subgraph at all
                      if (!tx && locallyCachedTx) {
                        return locallyCachedTx
                      }

                      // if it's a pending transaction, then definitely subscibe to the locally-cached transaction
                      if (
                        tx &&
                        isPending(tx) &&
                        isDeposit(tx) &&
                        locallyCachedTx
                      ) {
                        return locallyCachedTx
                      }

                      // else show the normal, static subgraph tx only
                      // eg. transaction is not pending, or not present locally, just show the subgraph one then
                      return tx
                    })()

                    return isDeposit(finalTx) ? (
                      <TransactionsTableDepositRow
                        key={`${finalTx.txId}-${finalTx.direction}`}
                        tx={finalTx}
                        className={!isLastRow ? 'border-b border-gray-5' : ''}
                      />
                    ) : (
                      <TransactionsTableWithdrawalRow
                        key={`${finalTx.txId}-${finalTx.direction}`}
                        tx={finalTx}
                        className={!isLastRow ? 'border-b border-gray-5' : ''}
                      />
                    )
                  })
                ) : (
                  <EmptyTableRow>
                    <span className="text-sm font-medium">
                      {isSmartContractWallet
                        ? 'You can see tx history in your smart contract wallet'
                        : 'No transactions'}
                    </span>
                  </EmptyTableRow>
                )}
              </>
            ) : null}
          </tbody>
        </table>
      }
    </>
  )
}
