import { useMemo } from 'react'
import { create } from 'zustand'
import useSWRImmutable from 'swr/immutable'
import { PageParams } from '../components/TransactionHistory/TransactionsTable/TransactionsTable'
import { useAppState } from '../state'
import { MergedTransaction } from '../state/app/state'
import { isPending, transformWithdrawals } from '../state/app/utils'
import {
  FetchWithdrawalsParams,
  fetchWithdrawals
} from '../util/withdrawals/fetchWithdrawals'
import { L2ToL1EventResultPlus } from './arbTokenBridge.types'
import { useL2Gateways } from './useL2Gateways'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import {
  TxHistoryTotalFetched,
  SubgraphQueryTypes,
  emptyTxHistoryTotalFetched,
  getAdditionalSubgraphQueryParams,
  mapSubgraphQueryTypeToTotalFetched,
  sumTxHistoryTotalFetched
} from '../util/SubgraphUtils'

export type CompleteWithdrawalData = {
  withdrawals: L2ToL1EventResultPlus[]
  pendingWithdrawals: L2ToL1EventResultPlus[]
  transformedWithdrawals: MergedTransaction[]
}

const withdrawalQueryTypes = [
  SubgraphQueryTypes.TxSent,
  SubgraphQueryTypes.TxReceived
]

// Tracks how many transactions have been stored for each transfer type.
// For each transfer type we do a separate subgraph query.
// We use these values to decide how many entries to skip for subsequent queries.
//
// This allows us to have transactions from different subgraph queries in a single table.
// We reset values to 0 and set the page to 1 when the address or networks change.
export const useWithdrawalsTotalFetched = create<{
  withdrawalsTotalFetched: TxHistoryTotalFetched
  setWithdrawalsTotalFetched: (data: TxHistoryTotalFetched) => void
  resetWithdrawalsTotalFetched: () => void
}>(set => ({
  withdrawalsTotalFetched: emptyTxHistoryTotalFetched,
  setWithdrawalsTotalFetched: data => set({ withdrawalsTotalFetched: data }),
  resetWithdrawalsTotalFetched: () =>
    set({ withdrawalsTotalFetched: emptyTxHistoryTotalFetched })
}))

const fetchCompleteWithdrawalData = async ({
  walletAddress,
  withdrawalsTotalFetched,
  setWithdrawalsTotalFetched,
  params
}: {
  walletAddress: string
  withdrawalsTotalFetched: TxHistoryTotalFetched
  setWithdrawalsTotalFetched: (data: TxHistoryTotalFetched) => void
  params: FetchWithdrawalsParams & { pageNumber: number }
}): Promise<CompleteWithdrawalData> => {
  // create queries for each transfer type
  // we will fetch them all, and in the next steps we decide which of them to display
  const promises = withdrawalQueryTypes.map(type =>
    fetchWithdrawals({
      ...params,
      ...getAdditionalSubgraphQueryParams(type, walletAddress),
      totalFetched: withdrawalsTotalFetched[type]
    })
  )

  // get the original withdrawals
  const withdrawals = (await Promise.all(promises)).flat()
  // we grab the earliest {pageSize} txs from all fetched withdrawals
  // they are going to be displayed in the tx history
  const earliestWithdrawals = [...withdrawals]
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    .slice(0, params.pageSize)

  // filter out pending withdrawals
  const pendingWithdrawalMap = new Map<string, boolean>()
  const completeWithdrawalData = transformWithdrawals(earliestWithdrawals)

  completeWithdrawalData.forEach(completeTxData => {
    if (isPending(completeTxData)) {
      pendingWithdrawalMap.set(completeTxData.txId, true)
    }
  })
  const pendingWithdrawals = [...earliestWithdrawals].filter(
    tx =>
      tx.l2TxHash &&
      typeof pendingWithdrawalMap.get(tx.l2TxHash) !== 'undefined'
  )

  // the most recently fetched withdrawals (current fetch)
  // here we count how many txs of each type we fetched and store this info
  const recentWithdrawalsTotalFetched =
    mapSubgraphQueryTypeToTotalFetched(earliestWithdrawals)

  // we create a new fetched count by adding the most recent one to the currently stored one
  const newWithdrawalsTotalFetched = sumTxHistoryTotalFetched(
    withdrawalsTotalFetched,
    recentWithdrawalsTotalFetched
  )

  // we update the currently stored fetched count with the new one
  setWithdrawalsTotalFetched(newWithdrawalsTotalFetched)

  return {
    withdrawals: earliestWithdrawals,
    pendingWithdrawals,
    transformedWithdrawals: completeWithdrawalData
  }
}

export const useWithdrawals = (withdrawalPageParams: PageParams) => {
  const { l1, l2 } = useNetworksAndSigners()
  const { withdrawalsTotalFetched, setWithdrawalsTotalFetched } =
    useWithdrawalsTotalFetched()

  // only change l1-l2 providers (and hence, reload withdrawals) when the connected chain id changes
  // otherwise tx-history unnecessarily reloads on l1<->l2 network switch as well (#847)
  const l1Provider = useMemo(() => l1.provider, [l1.network.id])
  const l2Provider = useMemo(() => l2.provider, [l2.network.id])

  const gatewaysToUse = useL2Gateways({ l2Provider })

  const {
    app: {
      arbTokenBridge: { walletAddress }
    }
  } = useAppState()

  /* return the cached response for the complete pending transactions */
  return useSWRImmutable(
    [
      'withdrawals',
      walletAddress,
      l1Provider,
      l2Provider,
      gatewaysToUse,
      withdrawalPageParams.pageNumber,
      withdrawalPageParams.pageSize,
      withdrawalPageParams.searchString
    ],
    ([
      ,
      _walletAddress,
      _l1Provider,
      _l2Provider,
      _gatewayAddresses,
      _pageNumber,
      _pageSize,
      _searchString
    ]) =>
      fetchCompleteWithdrawalData({
        walletAddress: _walletAddress,
        withdrawalsTotalFetched,
        setWithdrawalsTotalFetched,
        params: {
          l1Provider: _l1Provider,
          l2Provider: _l2Provider,
          gatewayAddresses: _gatewayAddresses,
          pageNumber: _pageNumber,
          pageSize: _pageSize,
          searchString: _searchString
        }
      })
  )
}
