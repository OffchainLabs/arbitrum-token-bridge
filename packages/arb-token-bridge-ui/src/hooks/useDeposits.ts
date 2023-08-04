import { useMemo } from 'react'
import { create } from 'zustand'
import useSWRImmutable from 'swr/immutable'
import { PageParams } from '../components/TransactionHistory/TransactionsTable/TransactionsTable'
import { useAppState } from '../state'
import { MergedTransaction } from '../state/app/state'
import { isPending, transformDeposits } from '../state/app/utils'
import {
  FetchDepositParams,
  fetchDeposits
} from '../util/deposits/fetchDeposits'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import { Transaction } from './useTransactions'
import {
  TxHistoryTransferTypes,
  getAdditionalSubgraphQueryParams
} from '../util/SubgraphUtils'

export type CompleteDepositData = {
  deposits: Transaction[]
  pendingDeposits: Transaction[]
  transformedDeposits: MergedTransaction[]
}

type TxHistoryTotalFetched = { [key in TxHistoryTransferTypes]: number }

const emptyTxHistoryTotalFetched: TxHistoryTotalFetched = {
  [TxHistoryTransferTypes.DepositSent]: 0,
  [TxHistoryTransferTypes.DepositReceived]: 0,
  [TxHistoryTransferTypes.RetryableSent]: 0,
  [TxHistoryTransferTypes.RetryableReceived]: 0
}

// Tracks how many transactions have been stored for each transfer type.
// For each transfer type we do a separate subgraph query.
// We use these values to decide how many entries to skip for subsequent queries.
//
// This allows us to have transactions from different subgraph queries in a single table.
// We reset values to 0 and set the page to 1 when the address or networks change.
export const useTxHistoryTotalFetched = create<{
  txHistoryTotalFetched: TxHistoryTotalFetched
  setTxHistoryTotalFetched: (data: TxHistoryTotalFetched) => void
  resetTxHistoryTotalFetched: () => void
}>(set => ({
  txHistoryTotalFetched: emptyTxHistoryTotalFetched,
  setTxHistoryTotalFetched: data => set({ txHistoryTotalFetched: data }),
  resetTxHistoryTotalFetched: () =>
    set({ txHistoryTotalFetched: emptyTxHistoryTotalFetched })
}))

// Separates different 'transferType's for each transaction, and counts them.
// We store this to know how many entries to skip in the next query.
function mapTransferTypeToTotalFetched(
  txs: Transaction[]
): TxHistoryTotalFetched {
  const data = { ...emptyTxHistoryTotalFetched }

  for (const tx of txs) {
    const type = tx.transferType as TxHistoryTransferTypes
    const current = data[type]
    data[type] = current + 1
  }

  return data
}

function sumTxHistoryTotalFetched(
  txHistoryTotalFetched_1: TxHistoryTotalFetched,
  txHistoryTotalFetched_2: TxHistoryTotalFetched
) {
  const result: TxHistoryTotalFetched = { ...txHistoryTotalFetched_1 }
  Object.keys(txHistoryTotalFetched_1).map(type => {
    const _type = type as TxHistoryTransferTypes
    result[_type] =
      txHistoryTotalFetched_1[_type] + txHistoryTotalFetched_2[_type]
  })

  return result
}

export const fetchCompleteDepositData = async ({
  walletAddress,
  txHistoryTotalFetched,
  setTxHistoryTotalFetched,
  depositParams
}: {
  walletAddress: string
  txHistoryTotalFetched: TxHistoryTotalFetched
  setTxHistoryTotalFetched: (data: TxHistoryTotalFetched) => void
  depositParams: FetchDepositParams & { pageNumber: number }
}): Promise<CompleteDepositData> => {
  // create queries for each transfer type
  // we will fetch them all, and in the next steps we decide which of them to display
  const promises = Object.values(TxHistoryTransferTypes).map(type =>
    fetchDeposits({
      type,
      ...depositParams,
      ...getAdditionalSubgraphQueryParams(type, walletAddress),
      totalFetched: txHistoryTotalFetched[type]
    })
  )

  // get the original deposits
  const deposits = (await Promise.all(promises)).flat()
  // we grab the earliest {pageSize} txs from all fetched deposits
  // they are going to be displayed in the tx history
  const earliestDeposits = [...deposits]
    .sort((a, b) => Number(b.timestampCreated) - Number(a.timestampCreated))
    .slice(0, depositParams.pageSize)

  // filter out pending deposits
  const pendingDepositsMap = new Map<string, boolean>()
  // get their complete transformed data (so that we get their exact status)
  const completeDepositData = transformDeposits(earliestDeposits)
  completeDepositData.forEach(completeTxData => {
    if (isPending(completeTxData)) {
      pendingDepositsMap.set(completeTxData.txId, true)
    }
  })
  const pendingDeposits = [...earliestDeposits].filter(
    tx => typeof pendingDepositsMap.get(tx.txID) !== 'undefined'
  )

  // the most recently fetched deposits (current fetch)
  // here we count how many txs of each type we fetched and store this info
  const recentTxHistoryTotalFetched =
    mapTransferTypeToTotalFetched(earliestDeposits)

  // we create a new fetched count by adding the most recent one to the currently stored one
  const newTxHistoryTotalFetched = sumTxHistoryTotalFetched(
    txHistoryTotalFetched,
    recentTxHistoryTotalFetched
  )

  // we update the currently stored fetched count with the new one
  setTxHistoryTotalFetched(newTxHistoryTotalFetched)

  return {
    deposits: earliestDeposits,
    pendingDeposits,
    transformedDeposits: completeDepositData
  }
}

export const useDeposits = (depositPageParams: PageParams) => {
  const { l1, l2 } = useNetworksAndSigners()
  const { txHistoryTotalFetched, setTxHistoryTotalFetched } =
    useTxHistoryTotalFetched()

  // only change l1-l2 providers (and hence, reload deposits) when the connected chain id changes
  // otherwise tx-history unnecessarily reloads on l1<->l2 network switch as well (#847)
  const l1Provider = useMemo(() => l1.provider, [l1.network.id])
  const l2Provider = useMemo(() => l2.provider, [l2.network.id])

  const {
    app: {
      arbTokenBridge: { walletAddress }
    }
  } = useAppState()

  /* return the cached response for the complete pending transactions */
  return useSWRImmutable(
    [
      'deposits',
      walletAddress,
      l1Provider,
      l2Provider,
      depositPageParams.pageNumber,
      depositPageParams.pageSize,
      depositPageParams.searchString
    ],
    ([
      ,
      _walletAddress,
      _l1Provider,
      _l2Provider,
      _pageNumber,
      _pageSize,
      _searchString
    ]) =>
      fetchCompleteDepositData({
        walletAddress: _walletAddress,
        txHistoryTotalFetched,
        setTxHistoryTotalFetched,
        depositParams: {
          l1Provider: _l1Provider,
          l2Provider: _l2Provider,
          pageNumber: _pageNumber,
          pageSize: _pageSize,
          searchString: _searchString
        }
      })
  )
}
