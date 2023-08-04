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
  TxHistoryTotalFetched,
  SubgraphQueryTypes,
  emptyTxHistoryTotalFetched,
  getAdditionalSubgraphQueryParams,
  mapSubgraphQueryTypeToTotalFetched,
  sumTxHistoryTotalFetched
} from '../util/SubgraphUtils'
import { useIsConnectedToArbitrum } from './useIsConnectedToArbitrum'
import { useAccountType } from './useAccountType'

export type CompleteDepositData = {
  deposits: Transaction[]
  pendingDeposits: Transaction[]
  transformedDeposits: MergedTransaction[]
}

// Tracks how many transactions have been fetched for each SubgraphQueryType.
// For each SubgraphQueryType we do a separate subgraph query.
// We use these values to decide how many entries to skip for subsequent queries.
//
// This allows us to have transactions from different subgraph queries in a single table.
// We reset values to 0 and set the page to 1 when the address or networks change.
export const useDepositsTotalFetchedStore = create<{
  depositsTotalFetched: TxHistoryTotalFetched
  setDepositsTotalFetched: (data: TxHistoryTotalFetched) => void
  resetDepositsTotalFetched: () => void
}>(set => ({
  depositsTotalFetched: emptyTxHistoryTotalFetched,
  setDepositsTotalFetched: data => set({ depositsTotalFetched: data }),
  resetDepositsTotalFetched: () =>
    set({ depositsTotalFetched: emptyTxHistoryTotalFetched })
}))

export const fetchCompleteDepositData = async ({
  walletAddress,
  depositQueryTypes,
  depositsTotalFetched,
  setDepositsTotalFetched,
  depositParams
}: {
  walletAddress: string
  depositQueryTypes: Partial<SubgraphQueryTypes>[]
  depositsTotalFetched: TxHistoryTotalFetched
  setDepositsTotalFetched: (data: TxHistoryTotalFetched) => void
  depositParams: FetchDepositParams & { pageNumber: number }
}): Promise<CompleteDepositData> => {
  // create queries for each SubgraphQueryType for deposits
  // we will fetch them all, and in the next steps we decide which of them to display
  const promises = depositQueryTypes.map(type =>
    fetchDeposits({
      subgraphQueryType: type,
      ...depositParams,
      ...getAdditionalSubgraphQueryParams(type, walletAddress),
      totalFetched: depositsTotalFetched[type]
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
  const recentDepositsTotalFetched =
    mapSubgraphQueryTypeToTotalFetched(earliestDeposits)

  // we create a new fetched count by adding the most recent one to the currently stored one
  const newDepositsTotalFetched = sumTxHistoryTotalFetched(
    depositsTotalFetched,
    recentDepositsTotalFetched
  )

  // we update the currently stored fetched count with the new one
  setDepositsTotalFetched(newDepositsTotalFetched)

  return {
    deposits: earliestDeposits,
    pendingDeposits,
    transformedDeposits: completeDepositData
  }
}

export const useDeposits = (depositPageParams: PageParams) => {
  const { l1, l2 } = useNetworksAndSigners()
  const isConnectedToArbitrum = useIsConnectedToArbitrum()
  const { isSmartContractWallet } = useAccountType()
  const { depositsTotalFetched, setDepositsTotalFetched } =
    useDepositsTotalFetchedStore()

  // only change l1-l2 providers (and hence, reload deposits) when the connected chain id changes
  // otherwise tx-history unnecessarily reloads on l1<->l2 network switch as well (#847)
  const l1Provider = useMemo(() => l1.provider, [l1.network.id])
  const l2Provider = useMemo(() => l2.provider, [l2.network.id])

  const depositQueryTypes = useMemo(() => {
    if (
      typeof isSmartContractWallet === 'undefined' ||
      typeof isConnectedToArbitrum === 'undefined'
    ) {
      return []
    }
    // contract wallet address is tied to a specific network, therefore:
    if (isSmartContractWallet) {
      // if connected to L2, we only fetch received txs
      if (isConnectedToArbitrum) {
        return [SubgraphQueryTypes.TxReceived]
      }
      // if connected to L1, we only fetch sent txs
      return [SubgraphQueryTypes.TxSent]
    }
    // EOA
    // TODO: Add retryables for custom address ETH
    return [SubgraphQueryTypes.TxSent, SubgraphQueryTypes.TxReceived]
  }, [isConnectedToArbitrum, isSmartContractWallet])

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
      isSmartContractWallet,
      isConnectedToArbitrum,
      depositPageParams.pageNumber,
      depositPageParams.pageSize,
      depositPageParams.searchString
    ],
    ([
      ,
      _walletAddress,
      _l1Provider,
      _l2Provider,
      ,
      ,
      _pageNumber,
      _pageSize,
      _searchString
    ]) =>
      fetchCompleteDepositData({
        walletAddress: _walletAddress,
        depositQueryTypes,
        depositsTotalFetched,
        setDepositsTotalFetched,
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
