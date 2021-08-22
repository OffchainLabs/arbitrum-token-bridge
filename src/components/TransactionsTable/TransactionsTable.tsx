import React from 'react'

import dayjs from 'dayjs'
import Countdown from 'react-countdown'
import { L2ToL1EventResultPlus, Transaction, TxnType } from 'token-bridge-sdk'
import { TxnStatus } from 'token-bridge-sdk/dist/hooks/useTransactions'

import { MergedTransaction } from '../../state/app/state'
import ExplorerLink from '../common/ExplorerLink'
import { StatusBadge } from '../common/StatusBadge'

interface TransactionsTableProps {
  transactions: MergedTransaction[]
}

const StatusMappings: Record<TxnStatus, string> = {
  pending: 'Processing',
  success: 'Success',
  confirmed: 'Confirmed',
  failure: 'Failed'
}

const PendingCountdown = ({ tx }: { tx: MergedTransaction }): JSX.Element => {
  const now = dayjs()
  const whenCreated = dayjs(tx?.createdAt)
  const diffInSeconds = now.diff(whenCreated, 'seconds')
  return (
    <Countdown
      date={now
        .add(Math.max(10 * 60 - diffInSeconds + 10, 0), 'seconds')
        .toDate()}
      renderer={({ hours, minutes, seconds, completed }) => {
        // if (completed) {
        //   // Render a completed state
        //   return <>Done</>
        // }
        // Render a countdown
        return (
          <span className="text-bright-blue">
            {hours}:{minutes} Mins
          </span>
        )
      }}
    />
  )
}

const TableRow = ({ tx }: { tx: MergedTransaction }): JSX.Element => {
  return (
    <tr>
      <td className="px-6 py-6 whitespace-nowrap text-sm leading-5 font-normal text-dark-blue">
        {tx.direction}
      </td>
      <td className="px-4 py-6  whitespace-nowrap text-sm ">
        <StatusBadge
          variant={
            tx.status === 'success'
              ? 'green'
              : tx.status === 'failure'
              ? 'red'
              : tx.status === 'pending'
              ? 'blue'
              : 'yellow'
          }
        >
          {tx.status}
        </StatusBadge>
      </td>
      <td className="px-6 py-6 whitespace-nowrap text-sm leading-5 font-normal text-gray-500">
        {tx.createdAt && tx.status === 'pending' ? (
          <PendingCountdown tx={tx} />
        ) : (
          <span>N/A</span>
        )}
      </td>
      <td className="px-6 py-6 whitespace-nowrap text-sm leading-5 font-normal text-dark-blue">
        <ExplorerLink hash={tx.txId} type={tx.direction as TxnType} />
      </td>
      <td className="px-4 py-6 whitespace-nowrap text-xs leading-4 font-medium text-navy">
        <span className="bg-tokenPill rounded-lg py-1 px-3">{tx.asset}</span>
      </td>
      <td className="px-6 py-6 whitespace-nowrap text-sm leading-5 font-normal text-gray-500">
        {tx.value}
      </td>
      <td className="px-2 py-6 whitespace-nowrap leading-5 font-normal text-gray-500">
        {/* <button */}
        {/*  type="submit" */}
        {/*  className="flex items-center justify-center bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 p-2 min-w-16" */}
        {/* > */}
        {/*  Action */}
        {/* </button> */}
      </td>
    </tr>
  )
}

const TransactionsTable = ({
  transactions
}: TransactionsTableProps): JSX.Element => {
  return (
    <div className="flex flex-col shadow-sm">
      <div className="-my-2 overflow-x-auto ">
        <div className="py-2 align-middle inline-block min-w-full ">
          <div className="overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Direction
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Estimated Arrival Time
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Txid
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Asset
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Value
                  </th>
                  <th
                    scope="col"
                    className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map(tx => (
                  <TableRow tx={tx} key={tx.txId} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export { TransactionsTable }
