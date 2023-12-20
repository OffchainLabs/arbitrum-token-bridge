import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { twMerge } from 'tailwind-merge'
import { AutoSizer, Column, Table } from 'react-virtualized'
import {
  ArrowDownOnSquareIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

import { MergedTransaction } from '../../state/app/state'
import {
  getStandardizedDate,
  getStandardizedTime,
  isCustomDestinationAddressTx,
  isPending,
  isTokenDeposit
} from '../../state/app/utils'
import { TransactionsTableClaimableRow } from './TransactionsTableClaimableRow'
import { TransactionsTableDepositRow } from './TransactionsTableDepositRow'
import { useTokensFromLists } from '../TransferPanel/TokenSearchUtils'
import { SafeImage } from '../common/SafeImage'
import { Loader } from '../common/atoms/Loader'
import { ExternalLink } from '../common/ExternalLink'
import { GET_HELP_LINK } from '../../constants'
import { ChainPair } from '../../hooks/useTransactionHistory'
import { Tooltip } from '../common/Tooltip'
import { getNetworkName } from '../../util/networks'
import { PendingDepositWarning } from './PendingDepositWarning'
import { isTxPending } from './helpers'

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
  loading,
  completed,
  error,
  failedChainPairs,
  numberOfDays,
  resume,
  rowHeight,
  rowHeightCustomDestinationAddress,
  selectedTabIndex
}: {
  transactions: MergedTransaction[]
  loading: boolean
  completed: boolean
  error: unknown
  failedChainPairs: ChainPair[]
  numberOfDays: number
  resume: () => void
  rowHeight: number
  rowHeightCustomDestinationAddress: number
  selectedTabIndex: number
}) => {
  const contentAboveTable = useRef<HTMLDivElement>(null)

  const isTxHistoryEmpty = transactions.length === 0
  const isPendingTab = selectedTabIndex === 0

  const paused = !loading && !completed

  const [tableHeight, setTableHeight] = useState(0)

  const { pendingTokenDepositsCount } = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        if (isTokenDeposit(tx) && isTxPending(tx)) {
          acc.pendingTokenDepositsCount++
        }
        return acc
      },
      {
        pendingTokenDepositsCount: 0
      }
    )
  }, [transactions])

  useEffect(() => {
    // Calculate table height to be passed to the React Virtualized Table
    const currentRef = contentAboveTable.current
    const SIDE_PANEL_HEADER_HEIGHT = 120

    // Adjust the table size whenever the content above it is resized
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        const aboveHeight = entries[0].contentRect.height
        const viewportHeight = window.innerHeight
        const newTableHeight = Math.max(
          viewportHeight - aboveHeight - SIDE_PANEL_HEADER_HEIGHT,
          0
        )
        setTableHeight(newTableHeight)
      }
    })

    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [])

  const FailedChainPairsTooltip = useCallback(() => {
    if (failedChainPairs.length === 0) {
      return null
    }
    return (
      <Tooltip
        content={
          <div className="flex flex-col space-y-1 text-xs">
            <span>We were unable to fetch data for the following chains:</span>
            <ul className="flex list-disc flex-col pl-4">
              {failedChainPairs.map(pair => (
                <li key={`${pair.parentChain}-${pair.chain}`}>
                  between <b>{getNetworkName(pair.parentChain)}</b> and{' '}
                  <b>{getNetworkName(pair.chain)}</b>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <ExclamationCircleIcon height={20} className="text-error" />
      </Tooltip>
    )
  }, [failedChainPairs])

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

  const numberOfDaysString = `${numberOfDays}${
    numberOfDays === 1 ? ' day' : ' days'
  }`

  if (isTxHistoryEmpty) {
    if (loading) {
      return (
        <div
          className={twMerge(
            'flex space-x-2 rounded-tr-lg bg-white p-4',
            isPendingTab ? '' : 'rounded-tl-lg'
          )}
        >
          <Loader wrapperClass="animate-pulse" color="black" size="small" />
          <span className="animate-pulse text-sm">Loading transactions...</span>
        </div>
      )
    }
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
    if (paused) {
      return (
        <div>
          <div className="flex justify-between bg-white p-4">
            <span className="text-sm">
              Looks like there are no transactions in the last{' '}
              {numberOfDaysString}.
            </span>
          </div>
          <button onClick={resume} className="arb-hover text-sm">
            <div className="flex space-x-1 rounded border border-black px-2 py-1">
              <span>Load more</span>
              <ArrowDownOnSquareIcon width={16} />
            </div>
          </button>
        </div>
      )
    }
    if (paused) {
      return (
        <div>
          <div className="flex justify-between bg-white p-4">
            <span className="text-sm">
              Looks like there are no transactions in the last{' '}
              {numberOfDaysString}.
            </span>
          </div>
          <button onClick={resume} className="arb-hover text-sm">
            <div className="flex space-x-1 rounded border border-black px-2 py-1">
              <span>Load more</span>
              <ArrowDownOnSquareIcon width={16} />
            </div>
          </button>
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
    <div className="h-full flex-col overflow-x-auto">
      <div
        className={twMerge(
          'w-[960px] rounded-tr-lg bg-white px-8 pt-4',
          isPendingTab ? '' : 'rounded-tl-lg'
        )}
        ref={contentAboveTable}
      >
        {loading ? (
          <div className="flex animate-pulse space-x-2">
            <FailedChainPairsTooltip />
            <Loader size="small" />
            <span className="text-sm">Loading transactions...</span>
          </div>
        ) : (
          <div className="flex justify-between">
            <div className="flex justify-start space-x-1">
              <FailedChainPairsTooltip />
              <span className="text-sm">
                Showing {transactions.length}{' '}
                {isPendingTab ? 'pending' : 'settled'} transactions for the last{' '}
                {numberOfDaysString}.
              </span>
            </div>

            {!completed && (
              <button onClick={resume} className="arb-hover text-sm">
                <div className="flex space-x-1 rounded border border-black px-2 py-1">
                  <span>Load more</span>
                  <ArrowDownOnSquareIcon width={16} />
                </div>
              </button>
            )}
          </div>
        )}
        <div>{pendingTokenDepositsCount > -1 && <PendingDepositWarning />}</div>
      </div>
      <AutoSizer disableHeight>
        {() => (
          <Table
            width={960}
            height={tableHeight}
            rowHeight={({ index }) => getRowHeight(index)}
            rowCount={transactions.length}
            headerHeight={52}
            headerRowRenderer={props => (
              <div className="flex w-[960px] bg-white">{props.columns}</div>
            )}
            className="table-auto"
            rowGetter={({ index }) => transactions[index]}
            rowRenderer={({ index, key, style }) => {
              const tx = transactions[index]
              const isEvenRow = index % 2 === 0

              if (!tx) {
                return null
              }

              const bgColorSettled = isEvenRow ? 'bg-cyan' : 'bg-white'
              const bgColorPending = 'bg-orange'

              return (
                <div
                  key={key}
                  style={{ ...style, height: `${getRowHeight(index)}px` }}
                >
                  {tx.isWithdrawal || tx.isCctp ? (
                    <TransactionsTableClaimableRow
                      tx={tx}
                      className={
                        isPending(tx) ? bgColorPending : bgColorSettled
                      }
                    />
                  ) : (
                    <TransactionsTableDepositRow
                      tx={tx}
                      className={
                        isPending(tx) ? bgColorPending : bgColorSettled
                      }
                    />
                  )}
                </div>
              )
            }}
          >
            <Column
              label="Status"
              dataKey="status"
              width={144}
              headerRenderer={() => (
                <TableHeader className="pl-8">Status</TableHeader>
              )}
            />
            <Column
              label="Date"
              dataKey="date"
              width={228}
              headerRenderer={() => (
                <TableHeader className="pl-6">Date</TableHeader>
              )}
            />
            <Column
              label="Token"
              dataKey="token"
              width={144}
              headerRenderer={() => (
                <TableHeader className="pl-12">Token</TableHeader>
              )}
            />
            <Column
              label="Networks"
              dataKey="networks"
              width={100}
              headerRenderer={() => (
                <TableHeader className="pl-6">Networks</TableHeader>
              )}
            />
          </Table>
        )}
      </AutoSizer>
    </div>
  )
}
