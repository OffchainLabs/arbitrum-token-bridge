import { Column, Table } from 'react-virtualized'
import { useMemo, useRef } from 'react'
import useSWR from 'swr'

import { ContentWrapper, TableHeader } from '../TransactionHistoryTable'
import { useTransactionHistoryAddressStore } from '../TransactionHistorySearchBar'
import { TransactionsTableRow } from '../TransactionsTableRow'
import { twMerge } from 'tailwind-merge'
import { MergedTransaction } from '../../../state/app/state'
import { AssetType } from '../../../hooks/arbTokenBridge.types'
import { formatAmount } from '../../../util/NumberUtils'
import { fetchDepositTxFromSubgraph } from '../../../util/deposits/fetchDepositTxFromSubgraph'

export function TransactionHistoryTxHashSearchResult() {
  const contentWrapperRef = useRef<HTMLDivElement | null>(null)
  const tableRef = useRef<Table | null>(null)
  const { sanitizedTxHash } = useTransactionHistoryAddressStore()
  const queryKey = useMemo(() => {
    if (!sanitizedTxHash) {
      return null
    }
    return [sanitizedTxHash, 'TransactionHistoryTxHashSearchResult'] as const
  }, [sanitizedTxHash])
  const {
    data: transactions,
    isLoading,
    error
  } = useSWR(queryKey, ([txHash]) => fetchDepositTxFromSubgraph(txHash))

  const TABLE_HEADER_HEIGHT = 52
  const TABLE_ROW_HEIGHT = 60

  const tableHeight = useMemo(() => {
    const transactionLength = 1

    if (window.innerWidth < 768) {
      return TABLE_ROW_HEIGHT * (transactionLength + 1) + TABLE_HEADER_HEIGHT
    }
    const SIDE_PANEL_HEADER_HEIGHT = 125
    const viewportHeight = window.innerHeight
    const contentWrapperOffsetTop = contentWrapperRef.current?.offsetTop ?? 0
    return Math.max(
      // we subtract a little padding at the end so that the table doesn't end at the edge of the screen
      viewportHeight - contentWrapperOffsetTop - SIDE_PANEL_HEADER_HEIGHT,
      0
    )
  }, [contentWrapperRef.current?.offsetTop])

  if (!transactions) {
    return null
  }

  return (
    <ContentWrapper
      ref={contentWrapperRef}
      className="relative block h-full min-h-[1px] w-full overflow-y-auto rounded p-0 text-left md:overflow-x-hidden md:border md:border-white"
    >
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

          console.log('tx????', tx)

          if (!tx) {
            return null
          }

          const isLastRow = index + 1 === transactions.length
          const key = `${tx.parentChainId}-${tx.childChainId}-${tx.txID}`

          return (
            <div key={key} style={style}>
              <TransactionsTableRow
                tx={tx as unknown as MergedTransaction}
                className={twMerge(isLastRow && 'border-b-0')}
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
