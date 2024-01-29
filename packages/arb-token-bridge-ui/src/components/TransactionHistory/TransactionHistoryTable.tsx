import {
  ButtonHTMLAttributes,
  PropsWithChildren,
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
import dayjs from 'dayjs'

import {
  getStandardizedDate,
  getStandardizedTime,
  isTokenDeposit
} from '../../state/app/utils'
import {
  ChainPair,
  UseTransactionHistoryResult
} from '../../hooks/useTransactionHistory'
import { Tooltip } from '../common/Tooltip'
import { getNetworkName } from '../../util/networks'
import { isTxPending } from './helpers'
import { PendingDepositWarning } from './PendingDepositWarning'
import { TransactionsTableRow } from './TransactionsTableRow'
import { EmptyTransactionHistory } from './EmptyTransactionHistory'
import { FilterType } from '../../hooks/useTransactionHistoryFilters'
import { TransactionHistoryTableHeader } from './TransactionHistoryTableHeader'

export const ContentWrapper = ({
  children,
  className = ''
}: PropsWithChildren<{ className?: string }>) => {
  return (
    <div
      className={twMerge(
        'w-full flex-col items-center rounded bg-[#191919] p-4 text-center text-xs text-white',
        className
      )}
    >
      {children}
    </div>
  )
}

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

export const LoadMoreButton = (
  props: ButtonHTMLAttributes<HTMLButtonElement>
) => {
  return (
    <button {...props} className="arb-hover text-xs">
      <div className="flex space-x-1 rounded border border-white px-2 py-1">
        <span>Load more</span>
        <ArrowDownOnSquareIcon width={16} />
      </div>
    </button>
  )
}

export const HistoryLoader = () => {
  return <span className="animate-pulse">Loading transactions...</span>
}

const FailedChainPairsTooltip = ({
  failedChainPairs
}: {
  failedChainPairs: ChainPair[]
}) => {
  if (failedChainPairs.length === 0) {
    return null
  }

  return (
    <Tooltip
      content={
        <div className="flex flex-col space-y-1 text-xs">
          <span>
            We were unable to fetch data for the following chain pairs:
          </span>
          <ul className="flex list-disc flex-col pl-4">
            {failedChainPairs.map(pair => (
              <li key={`${pair.parentChain}-${pair.chain}`}>
                <b>{getNetworkName(pair.parentChain)}</b>
                {' <> '}
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
}

export const TransactionHistoryTable = (
  props: UseTransactionHistoryResult & {
    address: `0x${string}` | undefined
    selectedTabIndex: number
    oldestTxTimeAgoString: string
  }
) => {
  const {
    address,
    transactions,
    loading,
    completed,
    error,
    failedChainPairs,
    chainIdsWithAtLeastOneTx,
    isFilterApplied,
    resume,
    restart,
    selectedTabIndex,
    oldestTxTimeAgoString
  } = props

  const contentAboveTable = useRef<HTMLDivElement>(null)

  const isTxHistoryEmpty = transactions.length === 0
  const isPendingTab = selectedTabIndex === 0

  const paused = !loading && !completed

  const [tableHeight, setTableHeight] = useState(0)

  const pendingTokenDepositsCount = useMemo(() => {
    return transactions.filter(tx => isTokenDeposit(tx) && isTxPending(tx))
      .length
  }, [transactions])

  // TODO: look into https://www.npmjs.com/package/react-intersection-observer that could simplify this
  useEffect(() => {
    // Calculate table height to be passed to the React Virtualized Table
    const currentRef = contentAboveTable.current
    const SIDE_PANEL_HEADER_HEIGHT = 125

    if (transactions.length === 0) {
      setTableHeight(0)
      return
    }

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
  }, [transactions.length])

  return (
    <ContentWrapper className="h-full overflow-x-auto p-0 text-left">
      {!isTxHistoryEmpty && (
        <div
          className={twMerge(
            'w-[960px] rounded-tr-lg px-4 pt-4',
            isPendingTab ? '' : 'rounded-tl-lg'
          )}
          ref={contentAboveTable}
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <FailedChainPairsTooltip failedChainPairs={failedChainPairs} />
              <HistoryLoader />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-start space-x-1">
                <FailedChainPairsTooltip failedChainPairs={failedChainPairs} />
                <span className="text-xs">
                  Showing {transactions.length}{' '}
                  {isPendingTab ? 'pending' : 'settled'} transactions made in{' '}
                  {oldestTxTimeAgoString}.
                </span>
              </div>

              {!completed && <LoadMoreButton onClick={resume} />}
            </div>
          )}
          <div>
            {pendingTokenDepositsCount > 0 && <PendingDepositWarning />}
          </div>
        </div>
      )}

      <AutoSizer disableHeight>
        {() => (
          <Table
            width={960}
            height={tableHeight}
            rowHeight={60}
            rowCount={transactions.length}
            headerHeight={transactions.length === 0 ? 0 : 52}
            headerRowRenderer={props => (
              <div className="mx-4 flex w-[928px] border-b border-white/30 text-white">
                {props.columns}
              </div>
            )}
            className="table-auto last:border-b-0"
            rowGetter={({ index }) => transactions[index]}
            rowRenderer={({ index, style }) => {
              const tx = transactions[index]

              if (!tx) {
                return null
              }

              const isLastRow = index + 1 === transactions.length
              const key = `${tx.parentChainId}-${tx.childChainId}-${tx.txId}`
              const secondsPassed = dayjs().diff(dayjs(tx.createdAt), 'second')

              // only blink the topmost tx, in case many txs are queued in a short amount of time
              const isTopmostPendingTx =
                transactions.filter(isTxPending)[0]?.txId === tx.txId

              return (
                <div key={key} style={style}>
                  <TransactionsTableRow
                    tx={tx}
                    className={twMerge(
                      isLastRow && 'border-b-0',
                      isTopmostPendingTx &&
                        secondsPassed <= 30 &&
                        'animate-blink bg-highlight'
                    )}
                    address={address}
                  />
                </div>
              )
            }}
          >
            <Column
              label="time"
              dataKey="time"
              width={139}
              headerRenderer={() => (
                <TransactionHistoryTableHeader
                  address={address}
                  restart={restart}
                >
                  TIME
                </TransactionHistoryTableHeader>
              )}
            />
            <Column
              label="token"
              dataKey="token"
              width={141}
              headerRenderer={() => (
                <TransactionHistoryTableHeader
                  address={address}
                  restart={restart}
                >
                  TOKEN
                </TransactionHistoryTableHeader>
              )}
            />
            <Column
              label="from"
              dataKey="from"
              width={142}
              headerRenderer={() => (
                <TransactionHistoryTableHeader
                  address={address}
                  restart={restart}
                  filter={
                    chainIdsWithAtLeastOneTx.source.length > 0
                      ? FilterType.HiddenSourceChains
                      : undefined
                  }
                >
                  FROM
                </TransactionHistoryTableHeader>
              )}
            />
            <Column
              label="to"
              dataKey="to"
              width={137}
              headerRenderer={() => (
                <TransactionHistoryTableHeader
                  address={address}
                  restart={restart}
                  filter={
                    chainIdsWithAtLeastOneTx.destination.length > 0
                      ? FilterType.HiddenDestinationChains
                      : undefined
                  }
                >
                  TO
                </TransactionHistoryTableHeader>
              )}
            />
            <Column
              label="status"
              dataKey="status"
              width={100}
              headerRenderer={() => (
                <TransactionHistoryTableHeader
                  address={address}
                  restart={restart}
                >
                  STATUS
                </TransactionHistoryTableHeader>
              )}
            />
          </Table>
        )}
      </AutoSizer>
      {isTxHistoryEmpty && (
        <EmptyTransactionHistory
          loading={loading}
          isError={typeof error !== 'undefined'}
          paused={paused}
          resume={resume}
          tab={isPendingTab ? 'pending' : 'settled'}
          // true if any filter is applied
          filtered={Object.values(isFilterApplied).some(Boolean)}
        />
      )}
    </ContentWrapper>
  )
}
