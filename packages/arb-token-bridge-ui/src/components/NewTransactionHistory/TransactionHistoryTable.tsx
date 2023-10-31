import { PropsWithChildren, useEffect, useRef } from 'react'
import { twMerge } from 'tailwind-merge'

import { MergedTransaction } from '../../state/app/state'
import { getStandardizedDate, getStandardizedTime } from '../../state/app/utils'
import { TransactionsTableClaimableRow } from './TransactionsTableClaimableRow'
import { TransactionsTableDepositRow } from './TransactionsTableDepositRow'
import { useTokensFromLists } from '../TransferPanel/TokenSearchUtils'
import { SafeImage } from '../common/SafeImage'
import { Loader } from '../common/atoms/Loader'
import { ExternalLink } from '../common/ExternalLink'
import { GET_HELP_LINK } from '../../constants'
import { ArrowDownOnSquareIcon } from '@heroicons/react/24/outline'

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

export const TokenIcon = ({ tx }: { tx: MergedTransaction }) => {
  const tokensFromLists = useTokensFromLists({
    parentChainId: tx.parentChainId,
    chainId: tx.chainId
  })

  if (!tx.tokenAddress) {
    const ethIconUrl =
      'https://raw.githubusercontent.com/ethereum/ethereum-org-website/957567c341f3ad91305c60f7d0b71dcaebfff839/src/assets/assets/eth-diamond-black-gray.png'

    return (
      /* SafeImage throws an error if eth logo is loaded from an external domain */
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={ethIconUrl} alt="Ether logo" className="h-5 w-5 rounded-full" />
    )
  }

  return (
    <SafeImage
      src={tokensFromLists[tx.tokenAddress]?.logoURI}
      alt="Token logo"
      className="h-5 w-5 rounded-full"
    />
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
  className,
  loading,
  completed,
  error,
  resume
}: {
  transactions: MergedTransaction[]
  className?: string
  loading: boolean
  completed: boolean
  error: unknown
  resume: () => void
}) => {
  const paused = !loading && !completed

  const tabPanelsRef = useRef<HTMLDivElement>(null)

  function isScrollable() {
    const el = tabPanelsRef.current
    return el && el.scrollHeight > el.clientHeight
  }

  function isScrolledToBottom() {
    const el = tabPanelsRef.current

    if (!el || !isScrollable()) {
      return false
    }

    const scrollPosition = el.scrollTop + el.clientHeight
    return scrollPosition >= el.scrollHeight
  }

  function handleScroll() {
    if (paused && isScrolledToBottom()) {
      resume()
    }
  }

  return (
    <>
      <div
        className={twMerge(
          'flex max-h-full flex-col overflow-auto rounded-lg bg-white',
          className
        )}
      >
        <div
          className="flex-1 overflow-y-auto"
          ref={tabPanelsRef}
          onScroll={handleScroll}
        >
          <table
            className="min-h-[80px] w-full"
            onScroll={() => console.log('1')}
          >
            <thead className="sticky top-0 z-50 bg-white">
              <TableHeader className="pl-6">Status</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader>Token</TableHeader>
              <TableHeader>Networks</TableHeader>
              <TableHeader />
            </thead>
            <tbody
              className={transactions.length === 0 ? 'relative h-16' : ''}
              onScroll={() => console.log('2')}
            >
              {transactions.length === 0 ? (
                error ? (
                  <div className="absolute left-0 top-0 flex space-x-2 px-6 pt-2 text-sm text-error">
                    <span>
                      We seem to be having a difficult time loading your data.
                      Please give it a moment and then try refreshing the page.
                      If the problem persists please file a ticket{' '}
                      <ExternalLink
                        className="arb-hover text-blue-link underline"
                        href={GET_HELP_LINK}
                      >
                        here
                      </ExternalLink>
                      .
                    </span>
                  </div>
                ) : (
                  <div className="absolute left-0 top-0 p-6 text-sm font-semibold">
                    <span className={loading ? 'animate-pulse' : ''}>
                      {loading ? (
                        <div className="flex space-x-2">
                          <Loader size="small" color="black" />
                          <span>Loading...</span>
                        </div>
                      ) : (
                        'Looks like no transactions here yet!'
                      )}
                    </span>
                  </div>
                )
              ) : (
                transactions.map(tx =>
                  tx.isWithdrawal ? (
                    <TransactionsTableClaimableRow
                      key={`${tx.parentChainId}-${tx.chainId}-${tx.txId}`}
                      tx={tx}
                    />
                  ) : (
                    <TransactionsTableDepositRow
                      key={`${tx.parentChainId}-${tx.chainId}-${tx.txId}`}
                      tx={tx}
                    />
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
      {paused && !isScrollable() && (
        <div className="mt-3 flex w-full justify-center">
          <button onClick={resume} className="arb-hover text-sm text-white">
            <div className="flex space-x-1 rounded border border-white/40 px-2 py-1 text-white/90">
              <span>Load more</span>
              <ArrowDownOnSquareIcon width={16} />
            </div>
          </button>
        </div>
      )}
    </>
  )
}
