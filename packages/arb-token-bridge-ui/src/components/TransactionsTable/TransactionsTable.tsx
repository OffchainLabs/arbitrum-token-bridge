import { MergedTransaction } from '../../state/app/state'
import { TransactionsTableDepositRow } from './TransactionsTableDepositRow'
import { TransactionsTableWithdrawalRow } from './TransactionsTableWithdrawalRow'

const isDeposit = (tx: MergedTransaction) => {
  return tx.direction === 'deposit' || tx.direction === 'deposit-l1'
}

export function TransactionsTable({
  transactions,
  className = ''
}: {
  transactions: MergedTransaction[]
  className?: string
}) {
  return (
    <table
      className={`w-full rounded-tr-lg rounded-br-lg rounded-bl-lg bg-v3-gray-1 ${className}`}
    >
      <thead className="border-b border-v3-gray-10 text-left text-sm text-v3-gray-10">
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
        {transactions.map((tx, index) => {
          const isFinalRow = index === transactions.length - 1

          return isDeposit(tx) ? (
            <TransactionsTableDepositRow
              key={`${tx.txId}-${tx.direction}`}
              tx={tx}
              className={!isFinalRow ? 'border-b border-v3-gray-10' : ''}
            />
          ) : (
            <TransactionsTableWithdrawalRow
              key={`${tx.txId}-${tx.direction}`}
              tx={tx}
              className={!isFinalRow ? 'border-b border-v3-gray-10' : ''}
            />
          )
        })}
      </tbody>
    </table>
  )
}
