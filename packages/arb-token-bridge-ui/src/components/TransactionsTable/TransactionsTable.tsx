import React, { useState } from 'react'
import Loader from 'react-loader-spinner'

import { MergedTransaction } from '../../state/app/state'
import { TransactionsTableDepositRow } from './TransactionsTableDepositRow'
import { TransactionsTableWithdrawalRow } from './TransactionsTableWithdrawalRow'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { PageParams } from '../common/TransactionHistory'

const isDeposit = (tx: MergedTransaction) => {
  return tx.direction === 'deposit' || tx.direction === 'deposit-l1'
}

function EmptyTableRow({ children }: { children: React.ReactNode }) {
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

export type TransactionsDataStatus = 'loading' | 'error' | 'success'

export type TransactionsTableProps = {
  status: TransactionsDataStatus
  transactions: MergedTransaction[]
  className?: string

  pageParams?: PageParams
  updatePageParams?: React.Dispatch<React.SetStateAction<PageParams>>

  // searchString?: string
  // pagination?: { pageNumber?: number; pageSize?: number }
  // handleSearch?: () => void
  // handlePagination?: () => void
}

export function TransactionsTable({
  status,
  transactions,
  className = '',
  pageParams,
  updatePageParams
}: TransactionsTableProps) {
  const { isSmartContractWallet } = useNetworksAndSigners()

  const [searchString, setSearchString] = useState(pageParams?.searchString)
  const [searchError, setSearchError] = useState(false)

  function validate_txhash(addr: string) {
    return /^0x([A-Fa-f0-9]{64})$/.test(addr)
  }

  const search = () => {
    if (searchString) {
      if (!validate_txhash(searchString)) {
        setSearchError(true)
      } else {
        // search logic - using `searchString`
        updatePageParams?.({ pageNumber: 0, pageSize: 10, searchString })
      }
    } else {
      updatePageParams?.({ pageNumber: 0, pageSize: 10, searchString: '' })
    }
  }

  const next = () => {
    updatePageParams?.(prevParams => ({
      ...prevParams,
      pageNumber: (prevParams?.pageNumber || 0) + 1
    }))
  }

  const prev = () => {
    updatePageParams?.(prevParams => ({
      ...prevParams,
      pageNumber: (prevParams?.pageNumber || 1) - 1
    }))
  }

  return (
    <>
      {/* Search bar */}
      <div className="w-full p-4">
        <input
          className="w-full text-dark"
          type="text"
          placeholder="Search for L1 transaction hash..."
          value={searchString}
          onChange={e => {
            searchError ? setSearchError(false) : null
            setSearchString(e.target.value)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              search()
            }
          }}
        />
        {searchError ? 'Oops - seems like a wrong L1 transaction hash!' : null}
      </div>

      {/* Pagination buttons */}
      <div className="flex w-full flex-row justify-between p-4">
        <button className="bg-blue-arbitrum p-2" onClick={prev}>
          Previous
        </button>

        <div>Page no. : {(pageParams?.pageNumber || 0) + 1} </div>

        <button className="bg-blue-arbitrum p-2" onClick={next}>
          Next
        </button>
      </div>
      <table
        className={`w-full rounded-tr-lg rounded-br-lg rounded-bl-lg bg-gray-1 ${className}`}
      >
        <thead className="border-b border-gray-10 text-left text-sm text-gray-10">
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
          {status === 'loading' && (
            <EmptyTableRow>
              <div className="flex flex-row items-center space-x-3">
                <Loader type="TailSpin" color="black" width={16} height={16} />
                <span className="text-sm font-medium">
                  Loading transactions
                </span>
              </div>
            </EmptyTableRow>
          )}

          {status === 'error' && (
            <EmptyTableRow>
              <span className="text-sm font-medium text-brick-dark">
                Failed to load transactions
              </span>
            </EmptyTableRow>
          )}

          {status === 'success' && (
            <>
              {transactions.length > 0 ? (
                transactions.map((tx, index) => {
                  const isFinalRow = index === transactions.length - 1

                  return isDeposit(tx) ? (
                    <TransactionsTableDepositRow
                      key={`${tx.txId}-${tx.direction}`}
                      tx={tx}
                      className={!isFinalRow ? 'border-b border-gray-10' : ''}
                    />
                  ) : (
                    <TransactionsTableWithdrawalRow
                      key={`${tx.txId}-${tx.direction}`}
                      tx={tx}
                      className={!isFinalRow ? 'border-b border-gray-10' : ''}
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
    </>
  )
}
