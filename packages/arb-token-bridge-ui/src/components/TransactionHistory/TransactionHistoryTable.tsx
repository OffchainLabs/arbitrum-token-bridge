import {
  ButtonHTMLAttributes,
  PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
  forwardRef
} from 'react'
import { twMerge } from 'tailwind-merge'
import { Column, Table } from 'react-virtualized'
import {
  ExclamationCircleIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'

import { isTokenDeposit } from '../../state/app/utils'
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
import { MergedTransaction } from '../../state/app/state'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'

export const BatchTransferNativeTokenTooltip = ({
  children,
  tx
}: PropsWithChildren<{ tx: MergedTransaction }>) => {
  const childProvider = getProviderForChainId(tx.childChainId)
  const nativeCurrency = useNativeCurrency({ provider: childProvider })

  return (
    <Tooltip
      content={`This is any additional ${nativeCurrency.symbol} you might have deposited along with your ERC-20, plus the refunded excess gas fee.`}
    >
      {children}
    </Tooltip>
  )
}

export const ContentWrapper = forwardRef<
  HTMLDivElement,
  PropsWithChildren<{ className?: string }>
>(({ children, className = '', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={twMerge(
        'w-full flex-col items-center rounded px-3 py-2 text-center text-sm text-white lg:text-left',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

ContentWrapper.displayName = 'ContentWrapper'

const TableHeader = ({
  children,
  className
}: PropsWithChildren<{ className?: string }>) => (
  <div
    className={twMerge(
      'h-full w-full pb-2 pt-4 text-left text-sm font-normal',
      className
    )}
  >
    {children}
  </div>
)

export const LoadMoreButton = (
  props: ButtonHTMLAttributes<HTMLButtonElement>
) => {
  return (
    <button
      {...props}
      className="arb-hover text-xs"
      aria-label="Load More Transactions"
    >
      <div className="flex space-x-1 rounded border border-white px-2 py-1">
        <span>Load more</span>
        <PlusCircleIcon width={16} />
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
              <li key={`${pair.parentChainId}-${pair.childChainId}`}>
                <b>{getNetworkName(pair.parentChainId)}</b>
                {' <> '}
                <b>{getNetworkName(pair.childChainId)}</b>
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

type TransactionHistoryTableProps = UseTransactionHistoryResult & {
  selectedTabIndex: number
  oldestTxTimeAgoString: string
}

export const TransactionHistoryTable = (
  props: TransactionHistoryTableProps
) => {
  const {
    transactions,
    loading,
    completed,
    error,
    failedChainPairs,
    resume,
    selectedTabIndex,
    oldestTxTimeAgoString
  } = props

  const TABLE_HEADER_HEIGHT = 52
  const TABLE_ROW_HEIGHT = 60
  const isTxHistoryEmpty = transactions.length === 0
  const isPendingTab = selectedTabIndex === 0

  const paused = !loading && !completed

  const contentWrapperRef = useRef<HTMLDivElement | null>(null)
  const tableRef = useRef<Table | null>(null)

  const tableHeight = useMemo(() => {
    if (window.innerWidth < 768) {
      return TABLE_ROW_HEIGHT * (transactions.length + 1) + TABLE_HEADER_HEIGHT
    }
    const SIDE_PANEL_HEADER_HEIGHT = 125
    const viewportHeight = window.innerHeight
    const contentWrapperOffsetTop = contentWrapperRef.current?.offsetTop ?? 0
    return Math.max(
      // we subtract a little padding at the end so that the table doesn't end at the edge of the screen
      viewportHeight - contentWrapperOffsetTop - SIDE_PANEL_HEADER_HEIGHT,
      0
    )
  }, [contentWrapperRef.current?.offsetTop, transactions.length])

  const pendingTokenDepositsCount = useMemo(() => {
    return transactions.filter(tx => isTokenDeposit(tx) && isTxPending(tx))
      .length
  }, [transactions])

  const topmostPendingTxId = useMemo(() => {
    return transactions.filter(isTxPending)[0]?.txId
  }, [transactions])

  // recalculate table height when tx number changes, or when user selects different tab
  useEffect(() => {
    tableRef.current?.recomputeRowHeights()
  }, [
    transactions.length,
    selectedTabIndex,
    isTxHistoryEmpty,
    contentWrapperRef.current?.offsetTop
  ])

  if (isTxHistoryEmpty) {
    return (
      <EmptyTransactionHistory
        loading={loading}
        isError={typeof error !== 'undefined'}
        paused={paused}
        resume={resume}
        tabType={isPendingTab ? 'pending' : 'settled'}
      />
    )
  }

  return (
    <ContentWrapper
      ref={contentWrapperRef}
      className="relative block h-full min-h-[1px] w-full overflow-y-auto rounded p-0 text-left md:overflow-x-hidden md:border md:border-white"
    >
      <div
        className={twMerge(
          'sticky left-0 w-full rounded-tr-lg pr-4 md:px-4 md:pt-4',
          isPendingTab ? '' : 'rounded-tl-lg'
        )}
      >
        {loading ? (
          <div className="flex h-[28px] items-center space-x-2">
            <FailedChainPairsTooltip failedChainPairs={failedChainPairs} />
            <HistoryLoader />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
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
        <div>{pendingTokenDepositsCount > 0 && <PendingDepositWarning />}</div>
      </div>

      <Table
        ref={tableRef}
        width={960}
        height={tableHeight}
        rowHeight={TABLE_ROW_HEIGHT}
        rowCount={transactions.length}
        headerHeight={TABLE_HEADER_HEIGHT}
        headerRowRenderer={props => (
          <div className="flex w-[960px] border-b border-white/30 text-white md:mx-4">
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
            topmostPendingTxId && topmostPendingTxId === tx.txId

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
              />
            </div>
          )
        }}
      >
        <Column
          label="time"
          dataKey="time"
          width={139}
          headerRenderer={() => <TableHeader>TIME</TableHeader>}
        />
        <Column
          label="token"
          dataKey="token"
          width={141}
          headerRenderer={() => <TableHeader>TOKEN</TableHeader>}
        />
        <Column
          label="from"
          dataKey="from"
          width={142}
          headerRenderer={() => <TableHeader>FROM</TableHeader>}
        />
        <Column
          label="to"
          dataKey="to"
          width={137}
          headerRenderer={() => <TableHeader>TO</TableHeader>}
        />
        <Column
          label="status"
          dataKey="status"
          width={100}
          headerRenderer={() => <TableHeader>STATUS</TableHeader>}
        />
      </Table>
    </ContentWrapper>
  )
}
