import React, { Dispatch, SetStateAction } from 'react'

import { TransactionsTableDepositRow } from './TransactionsTableDepositRow'
import { TransactionsTableWithdrawalRow } from './TransactionsTableWithdrawalRow'
import { useNetworksAndSigners } from '../../../hooks/useNetworksAndSigners'
import { useAppState } from '../../../state'
import { isDeposit } from '../../../state/app/utils'
import { MergedTransaction } from '../../../state/app/state'
import { NoDataOverlay } from './NoDataOverlay'
import { useMemo } from 'react'
import { TableBodyLoading } from './TableBodyLoading'
import { TableBodyError } from './TableBodyError'
import { TableActionHeader } from './TableActionHeader'

export type PageParams = {
  searchString: string
  pageNumber: number
  pageSize: number
}

export function EmptyTableRow({ children }: { children: React.ReactNode }) {
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
}

export function TransactionsTable({
  type,
  pageParams,
  setPageParams,
  transactions,
  loading,
  error
}: TransactionsTableProps) {
  const {
    app: {
      arbTokenBridge: { walletAddress }
    }
  } = useAppState()

  const { isSmartContractWallet } = useNetworksAndSigners()

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
          error
        }}
      />

      {/* when there are no search results found */}
      {noSearchResults ? <NoDataOverlay /> : null}

      {!noSearchResults && (
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

            {status === TableStatus.SUCCESS && (
              <>
                {transactions.length > 0 ? (
                  transactions.map((tx, index) => {
                    const isFinalRow = index === transactions.length - 1

                    return isDeposit(tx) ? (
                      <TransactionsTableDepositRow
                        key={`${tx.txId}-${tx.direction}`}
                        tx={tx}
                        className={!isFinalRow ? 'border-b border-gray-1' : ''}
                      />
                    ) : (
                      <TransactionsTableWithdrawalRow
                        key={`${tx.txId}-${tx.direction}`}
                        tx={tx}
                        className={!isFinalRow ? 'border-b border-gray-1' : ''}
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
            )}
          </tbody>
        </table>
      )}
    </>
  )
}
