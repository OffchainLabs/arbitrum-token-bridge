import { Column, Table } from 'react-virtualized'
import { useMemo, useRef } from 'react'
import { twMerge } from 'tailwind-merge'
import { ParentTransactionReceipt } from '@arbitrum/sdk'

import { ContentWrapper, TableHeader } from '../TransactionHistoryTable'
import { TransactionsTableRow } from '../TransactionsTableRow'
import { getParentTxReceipt } from '../helpers'
import { getChildToParentMessages, ReceiptState } from './helpers'

async function getData(txHash: string) {
  const parentTxReceipt = await getParentTxReceipt(txHash)
  const defaultReturn: {
    allMessages: L1ToL2MessagesAndDepositMessages
    l2ToL1MessagesToShow: L2ToL1MessageData[]
    parentTxReceipt: ParentTransactionReceipt | undefined
  } = {
    allMessages: {
      retryables: [],
      retryablesClassic: [],
      deposits: []
    },
    l2ToL1MessagesToShow: [],
    parentTxReceipt
  }

  if (parentTxReceipt === undefined) {
    const res = await getChildToParentMessages(txHash)
    const { ChildTxStatus, l2ToL1Messages } = res

    // TODO: handle terminal states
    if (l2ToL1Messages.length > 0) {
      return {
        ...defaultReturn,
        parentTxReceipt,
        txHashState: ReceiptState.MESSAGES_FOUND,
        l2ToL1MessagesToShow: l2ToL1Messages
      }
    }
    if (ChildTxStatus === ChildTxStatus.SUCCESS) {
      return {
        ...defaultReturn,
        parentTxReceipt,
        txHashState: ReceiptState.NO_L2_L1_MESSAGES
      }
    }
    if (ChildTxStatus === ChildTxStatus.FAILURE) {
      return {
        ...defaultReturn,
        parentTxReceipt,
        txHashState: ReceiptState.L2_FAILED
      }
    }

    return {
      ...defaultReturn,
      parentTxReceipt,
      txHashState: ReceiptState.NOT_FOUND
    }
  }

  const { l1TxnReceipt: _l1TxnReceipt, l1Network } = receiptRes
  if (_l1TxnReceipt.status === 0) {
    return {
      ...defaultReturn,
      l1TxnReceipt,
      txHashState: ReceiptState.L1_FAILED
    }
  }

  const allMessages = await getL1ToL2MessagesAndDepositMessages(
    _l1TxnReceipt,
    l1Network
  )
  const l1ToL2Messages = allMessages.retryables
  const l1ToL2MessagesClassic = allMessages.retryablesClassic
  const depositMessages = allMessages.deposits
  if (
    l1ToL2Messages.length === 0 &&
    l1ToL2MessagesClassic.length === 0 &&
    depositMessages.length === 0
  ) {
    return {
      ...defaultReturn,
      l1TxnReceipt,
      txHashState: ReceiptState.NO_L1_L2_MESSAGES
    }
  }

  return {
    ...defaultReturn,
    allMessages,
    l1TxnReceipt,
    receiptRes,
    txHashState: ReceiptState.MESSAGES_FOUND
  }
}

export function TransactionHistoryTxHashSearchResult() {
  const contentWrapperRef = useRef<HTMLDivElement | null>(null)
  const tableRef = useRef<Table | null>(null)

  const TABLE_HEADER_HEIGHT = 52
  const TABLE_ROW_HEIGHT = 60

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

          if (!tx) {
            return null
          }

          const isLastRow = index + 1 === transactions.length
          const key = `${tx.parentChainId}-${tx.childChainId}-${tx.txId}`

          return (
            <div key={key} style={style}>
              <TransactionsTableRow
                tx={tx}
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
