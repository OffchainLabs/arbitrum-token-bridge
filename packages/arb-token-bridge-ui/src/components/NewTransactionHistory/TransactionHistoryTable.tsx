import { PropsWithChildren, useCallback } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import dayjs from 'dayjs'

import { MergedTransaction, WithdrawalStatus } from '../../state/app/state'
import { useTokensFromLists } from '../TransferPanel/TokenSearchUtils'
import { Button } from '../common/Button'
import {
  StatusLabel,
  getDestChainId,
  getSourceChainId,
  getTxCompletionDate,
  getTxHumanReadableRemainingTime,
  getTxRemainingTimeInMinutes,
  getTxStatusLabel,
  isTxPending
} from './helpers'
import {
  getExplorerUrl,
  getNetworkLogo,
  getNetworkName
} from '../../util/networks'
import { ExternalLink } from '../common/ExternalLink'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { getStandardizedDate, getStandardizedTime } from '../../state/app/utils'
import { TransactionsTableClaimableRow } from './TransactionsTableClaimableRow'

export const TransactionDateTime = ({
  standardizedDate
}: {
  standardizedDate: number | null
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

const TableHeader = ({
  children,
  className
}: PropsWithChildren<{ className?: string }>) => (
  <th
    className={twMerge(
      'h-full w-1/5 py-4 pl-2 text-left text-sm font-normal',
      className
    )}
  >
    {children}
  </th>
)

export const TransactionHistoryTable = ({
  transactions,
  loading,
  type,
  className
}: {
  transactions: MergedTransaction[]
  loading: boolean
  type: 'pending' | 'settled'
  className?: string
}) => {
  return (
    <div
      className={twMerge(
        'flex max-h-full flex-col overflow-auto rounded-lg bg-white',
        className
      )}
    >
      <div className="flex-1 overflow-y-auto">
        <table className="min-h-[80px] w-full">
          <thead className="sticky top-0 z-50 bg-white">
            <TableHeader className="pl-6">Status</TableHeader>
            <TableHeader>Time</TableHeader>
            <TableHeader>Token</TableHeader>
            <TableHeader>TxID</TableHeader>
            <TableHeader />
          </thead>
          <tbody>
            {transactions.map(tx =>
              tx.isWithdrawal ? (
                <TransactionsTableClaimableRow
                  key={`${tx.parentChainId}-${tx.chainId}-${tx.txId}`}
                  tx={tx}
                />
              ) : (
                <></>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
