import { useMemo } from 'react'
import useSWRImmutable from 'swr/immutable'
import { unstable_serialize, useSWRConfig } from 'swr'
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
  getAdditionalSubgraphQueryParams,
  mapSubgraphQueryTypeToTotalFetched
} from '../util/SubgraphUtils'
import { useAccountType } from './useAccountType'
import { useIsConnectedToArbitrum } from './useIsConnectedToArbitrum'

export type CompleteWithdrawalData = {
  withdrawals: L2ToL1EventResultPlus[]
  pendingWithdrawals: L2ToL1EventResultPlus[]
  transformedWithdrawals: MergedTransaction[]
}

const fetchCompleteWithdrawalData = async ({
  walletAddress,
  withdrawalQueryTypes,
  withdrawalsTotalFetched,
  params
}: {
  walletAddress: string
  withdrawalQueryTypes: Partial<SubgraphQueryTypes>[]
  withdrawalsTotalFetched: TxHistoryTotalFetched
  params: FetchWithdrawalsParams
}): Promise<CompleteWithdrawalData> => {
  // create queries for each SubgraphQueryType for withdrawals
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

  return {
    withdrawals: earliestWithdrawals,
    pendingWithdrawals,
    transformedWithdrawals: completeWithdrawalData
  }
}

export const useWithdrawals = (withdrawalPageParams: PageParams) => {
  const { l1, l2 } = useNetworksAndSigners()
  const isConnectedToArbitrum = useIsConnectedToArbitrum()
  const { isSmartContractWallet } = useAccountType()
  const { cache } = useSWRConfig()

  // only change l1-l2 providers (and hence, reload withdrawals) when the connected chain id changes
  // otherwise tx-history unnecessarily reloads on l1<->l2 network switch as well (#847)
  const l1Provider = useMemo(() => l1.provider, [l1.network.id])
  const l2Provider = useMemo(() => l2.provider, [l2.network.id])

  const withdrawalQueryTypes = useMemo(() => {
    if (
      typeof isSmartContractWallet === 'undefined' ||
      typeof isConnectedToArbitrum === 'undefined'
    ) {
      return []
    }
    // contract wallet address is tied to a specific network, therefore:
    if (isSmartContractWallet) {
      // if connected to L2, we only fetch sent txs
      // if connected to L1, we only fetch received txs
      return isConnectedToArbitrum
        ? [SubgraphQueryTypes.TxSent]
        : [SubgraphQueryTypes.TxReceived]
    }
    // EOA
    return [SubgraphQueryTypes.TxSent, SubgraphQueryTypes.TxReceived]
  }, [isConnectedToArbitrum, isSmartContractWallet])

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
      isSmartContractWallet,
      isConnectedToArbitrum,
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
      _isSmartContractWallet,
      _isConnectedToArbitrum,
      _pageNumber,
      _pageSize,
      _searchString
    ]) => {
      const cachedTransactions: L2ToL1EventResultPlus[] = []

      // We need to know how many txs of each query type have been fetched so far.
      // First we get all the previous txs from cache.
      for (let prevPage = 0; prevPage < _pageNumber; prevPage++) {
        const txsFromCache = cache.get(
          unstable_serialize([
            'withdrawals',
            _walletAddress,
            _l1Provider,
            _l2Provider,
            _gatewayAddresses,
            _isSmartContractWallet,
            _isConnectedToArbitrum,
            prevPage,
            _pageSize,
            _searchString
          ])
        )?.data.withdrawals
        cachedTransactions.push(txsFromCache)
      }

      // Count txs by subgraph query type.
      const withdrawalsTotalFetched = mapSubgraphQueryTypeToTotalFetched(
        cachedTransactions.flat()
      )

      return fetchCompleteWithdrawalData({
        walletAddress: _walletAddress,
        withdrawalQueryTypes,
        withdrawalsTotalFetched,
        params: {
          l1Provider: _l1Provider,
          l2Provider: _l2Provider,
          gatewayAddresses: _gatewayAddresses,
          pageSize: _pageSize,
          searchString: _searchString
        }
      })
    }
  )
}
