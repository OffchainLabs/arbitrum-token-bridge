import { Column, Table } from 'react-virtualized'
import { useEffect, useMemo, useRef } from 'react'
import { twMerge } from 'tailwind-merge'
import { ParentTransactionReceipt } from '@arbitrum/sdk'
import useSWR from 'swr'

import { ContentWrapper, TableHeader } from '../TransactionHistoryTable'
import { TransactionsTableRow } from '../TransactionsTableRow'
import { getParentTxReceipt } from '../helpers'
import {
  ChildToParentMessageData,
  ChildTxStatus,
  getChildToParentMessages,
  ParentToChildMessagesAndDepositMessages,
  ReceiptState
} from './helpers'
import { getParentToChildMessagesAndDepositMessages } from './getParentToChildMessagesAndDepositMessages'
import { useTransactionHistoryAddressStore } from '../TransactionHistorySearchBar'

async function getData(txHash: string | undefined) {
  console.log('in getData: ', txHash)
  if (!txHash) {
    return
  }

  const getParentTxReceiptResult = await getParentTxReceipt(txHash)
  const parentTxReceipt = getParentTxReceiptResult
  const defaultReturn: {
    allMessages: ParentToChildMessagesAndDepositMessages
    l2ToL1MessagesToShow: ChildToParentMessageData[]
    parentTxReceipt: ParentTransactionReceipt | undefined
  } = {
    allMessages: {
      retryables: [],
      retryablesClassic: [],
      deposits: []
    },
    l2ToL1MessagesToShow: [],
    parentTxReceipt: getParentTxReceiptResult?.parentTxReceipt
  }

  if (getParentTxReceiptResult === undefined) {
    const res = await getChildToParentMessages(txHash)
    const { childTxStatus, childToParentMessages } = res

    // TODO: handle terminal states
    if (childToParentMessages.length > 0) {
      return {
        ...defaultReturn,
        parentTxReceipt,
        txHashState: ReceiptState.MESSAGES_FOUND,
        l2ToL1MessagesToShow: childToParentMessages
      }
    }
    if (childTxStatus === ChildTxStatus.SUCCESS) {
      return {
        ...defaultReturn,
        parentTxReceipt,
        txHashState: ReceiptState.NO_L2_L1_MESSAGES
      }
    }
    if (childTxStatus === ChildTxStatus.FAILURE) {
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

  const { parentTxReceipt: _parentTxReceipt, parentChainId } =
    getParentTxReceiptResult
  if (
    _parentTxReceipt?.status === 0 ||
    typeof _parentTxReceipt === 'undefined'
  ) {
    return {
      ...defaultReturn,
      parentTxReceipt,
      txHashState: ReceiptState.L1_FAILED
    }
  }

  const allMessages = await getParentToChildMessagesAndDepositMessages(
    _parentTxReceipt,
    parentChainId
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
      parentTxReceipt,
      txHashState: ReceiptState.NO_L1_L2_MESSAGES
    }
  }

  return {
    ...defaultReturn,
    allMessages,
    parentTxReceipt,
    txHashState: ReceiptState.MESSAGES_FOUND
  }
}

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
    data: getTxDataResult,
    isLoading,
    error
  } = useSWR(queryKey, ([_txHash]) => getData(_txHash), {
    refreshInterval: 30_000,
    shouldRetryOnError: true
  })

  console.log('getTxDataResult: ', getTxDataResult)

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

  if (!getTxDataResult) {
    return null
  }
  const {
    txHashState,
    parentTxReceipt,
    l2ToL1MessagesToShow: _l2ToL1MessagesToShow,
    allMessages
  } = getTxDataResult

  if (typeof parentTxReceipt === 'undefined') {
    return null
  }

  const transactions = [{ ...parentTxReceipt, allMessages }]

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
            return
          }

          if (typeof tx.parentTxReceipt === 'undefined') {
            return
          }

          const isLastRow = index + 1 === transactions.length
          const key = `${tx.parentChainId}-xxx-${tx.parentTxReceipt.transactionHash}`

          console.log('tx: ', tx)

          return (
            <div key={key} style={style}>
              {/* <TransactionsTableRow
                tx={tx}
                className={twMerge(isLastRow && 'border-b-0')}
              /> */}
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
