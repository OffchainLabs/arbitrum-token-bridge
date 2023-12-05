import { PropsWithChildren, useCallback, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  AutoSizer,
  Column,
  ScrollEventData,
  ScrollParams,
  Table
} from 'react-virtualized'
import { ArrowDownOnSquareIcon } from '@heroicons/react/24/outline'

import { MergedTransaction } from '../../state/app/state'
import {
  getStandardizedDate,
  getStandardizedTime,
  isCustomDestinationAddressTx
} from '../../state/app/utils'
import { TransactionsTableClaimableRow } from './TransactionsTableClaimableRow'
import { TransactionsTableDepositRow } from './TransactionsTableDepositRow'
import { useTokensFromLists } from '../TransferPanel/TokenSearchUtils'
import { SafeImage } from '../common/SafeImage'
import { Loader } from '../common/atoms/Loader'
import { ExternalLink } from '../common/ExternalLink'
import { GET_HELP_LINK } from '../../constants'

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
    chainId: tx.childChainId
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
      'h-full w-full py-4 pl-2 text-left text-sm font-normal',
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
  resume,
  rowHeight,
  rowHeightCustomDestinationAddress
}: {
  transactions: MergedTransaction[]
  className?: string
  loading: boolean
  completed: boolean
  error: unknown
  resume: () => void
  rowHeight: number
  rowHeightCustomDestinationAddress: number
}) => {
  const [scrollable, setScrollable] = useState(false)

  const isTxHistoryEmpty = transactions.length === 0

  const paused = !loading && !completed

  function isScrolledToBottom(e: ScrollParams | ScrollEventData) {
    const scrollPosition = e.scrollTop + e.clientHeight
    return scrollPosition >= e.scrollHeight
  }

  function handleScroll(e: ScrollParams | ScrollEventData) {
    console.log(
      `Result for ${transactions[0]?.status}: ${
        e.scrollHeight > e.clientHeight
      }`
    )
    if (paused && isScrolledToBottom(e)) {
      resume()
    }
    console.log('scrollH: ', e.scrollHeight)
    console.log('clientH: ', e.clientHeight)
    setScrollable(e.clientHeight > 0 && e.scrollHeight > e.clientHeight)
  }

  const getRowHeight = useCallback(
    (index: number) => {
      const tx = transactions[index]

      if (!tx) {
        return 0
      }

      return isCustomDestinationAddressTx(tx)
        ? rowHeightCustomDestinationAddress
        : rowHeight
    },
    [transactions, rowHeight, rowHeightCustomDestinationAddress]
  )

  console.log({ scrollable })

  if (isTxHistoryEmpty) {
    if (error) {
      return (
        <div className="flex space-x-2 bg-white p-4 text-sm text-error">
          <span>
            We seem to be having a difficult time loading your data. Please give
            it a moment and then try refreshing the page. If the problem
            persists please file a ticket{' '}
            <ExternalLink
              className="arb-hover text-blue-link underline"
              href={GET_HELP_LINK}
            >
              here
            </ExternalLink>
            .
          </span>
        </div>
      )
    }
    if (loading) {
      return (
        <div className="flex space-x-2 bg-white p-4">
          <Loader wrapperClass="animate-pulse" color="black" size="small" />
          <span className="animate-pulse text-sm">Loading transactions...</span>
        </div>
      )
    }
    if (paused) {
      return (
        <div>
          <div className="bg-white p-4">
            <span className="text-sm">
              We could not find any recent transactions!
            </span>
          </div>
          <div className="flex h-4 w-full justify-center ">
            <button onClick={resume} className="arb-hover text-sm text-white">
              <div className="mt-4 flex space-x-1 rounded border border-white/40 px-2 py-1 text-white/90">
                <span>Load more</span>
                <ArrowDownOnSquareIcon width={16} />
              </div>
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="bg-white p-4 text-sm">
        Looks like no transactions here yet!
      </div>
    )
  }

  return (
    <div className={twMerge('relative h-full flex-col rounded-lg', className)}>
      <AutoSizer>
        {({ width, height }) => (
          <Table
            width={width}
            height={height - 52}
            onScroll={handleScroll}
            rowHeight={({ index }) => getRowHeight(index)}
            rowCount={transactions.length}
            headerHeight={52}
            headerRowRenderer={props => (
              <div className="flex bg-white" style={{ width: width }}>
                {props.columns}
              </div>
            )}
            className="table-auto"
            rowGetter={({ index }) => transactions[index]}
            rowRenderer={({ index, key, style }) => {
              const tx = transactions[index]
              const isEvenRow = index % 2 === 0

              if (!tx) {
                return null
              }

              return (
                <div
                  key={key}
                  style={{ ...style, height: `${getRowHeight(index)}px` }}
                >
                  {tx.isWithdrawal ? (
                    <TransactionsTableClaimableRow
                      tx={tx}
                      className={isEvenRow ? 'bg-cyan' : 'bg-white'}
                    />
                  ) : (
                    <TransactionsTableDepositRow
                      tx={tx}
                      className={isEvenRow ? 'bg-cyan' : 'bg-white'}
                    />
                  )}
                </div>
              )
            }}
          >
            {/* TODO: FIX LAYOUT FOR HEADERS AND COLUMNS: WIDTH AND PADDING */}
            <Column
              label="Status"
              dataKey="status"
              width={width / 6}
              headerRenderer={() => (
                <TableHeader className="pl-8">Status</TableHeader>
              )}
            />
            <Column
              label="Date"
              dataKey="date"
              width={width / 5}
              headerRenderer={() => (
                <TableHeader className="pl-6">Date</TableHeader>
              )}
            />
            <Column
              label="Token"
              dataKey="token"
              width={width / 6}
              headerRenderer={() => (
                <TableHeader className="pl-12">Token</TableHeader>
              )}
            />
            <Column
              label="Networks"
              dataKey="networks"
              width={width / 6}
              headerRenderer={() => (
                <TableHeader className="pl-6">Networks</TableHeader>
              )}
            />
          </Table>
        )}
      </AutoSizer>
      {paused && !scrollable && (
        <div className="absolute bottom-[60px] mt-3 flex h-4 w-full justify-center">
          <button onClick={resume} className="arb-hover text-sm text-white">
            <div className="flex space-x-1 rounded border border-white/40 px-2 py-1 text-white/90">
              <span>Load more</span>
              <ArrowDownOnSquareIcon width={16} />
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
