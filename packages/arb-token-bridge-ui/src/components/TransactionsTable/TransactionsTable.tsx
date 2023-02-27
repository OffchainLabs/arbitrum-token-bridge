import React from 'react'

import { MergedTransaction } from '../../state/app/state'
import { TransactionsTableDepositRow } from './TransactionsTableDepositRow'
import { TransactionsTableWithdrawalRow } from './TransactionsTableWithdrawalRow'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { Loader } from '../common/atoms/Loader'

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
}

export function TransactionsTable({
  status,
  transactions,
  className = ''
}: TransactionsTableProps) {
  const { isSmartContractWallet } = useNetworksAndSigners()

  return (
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
              <Loader color="black" size="small" />
              <span className="text-sm font-medium">Loading transactions</span>
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
  )
}
