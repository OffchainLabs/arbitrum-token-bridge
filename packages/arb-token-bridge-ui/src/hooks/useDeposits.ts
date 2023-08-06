import { useMemo } from 'react'
import useSWRImmutable from 'swr/immutable'
import { unstable_serialize, useSWRConfig } from 'swr'
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
  SubgraphQueryTypes,
  SubgraphQueryTypeCount,
  countSubgraphQueryTypes,
  getAdditionalSubgraphQueryParams
} from '../util/SubgraphUtils'
import { useIsConnectedToArbitrum } from './useIsConnectedToArbitrum'
import { useAccountType } from './useAccountType'

export type CompleteDepositData = {
  deposits: Transaction[]
  pendingDeposits: Transaction[]
  transformedDeposits: MergedTransaction[]
}

export const fetchCompleteDepositData = async ({
  walletAddress,
  depositQueryTypes,
  depositsQueryCount,
  depositParams
}: {
  walletAddress: string
  depositQueryTypes: Partial<SubgraphQueryTypes>[]
  depositsQueryCount: SubgraphQueryTypeCount
  depositParams: FetchDepositParams
}): Promise<CompleteDepositData> => {
  // create queries for each SubgraphQueryType for deposits
  // we will fetch them all, and in the next steps we decide which of them to display
  const promises = depositQueryTypes.map(type =>
    fetchDeposits({
      subgraphQueryType: type,
      ...depositParams,
      ...getAdditionalSubgraphQueryParams(type, walletAddress),
      totalFetched: depositsQueryCount[type]
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
  const { cache } = useSWRConfig()

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
      // if connected to L1, we only fetch sent txs
      return isConnectedToArbitrum
        ? [SubgraphQueryTypes.TxReceived]
        : [SubgraphQueryTypes.TxSent]
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
      _isSmartContractWallet,
      _isConnectedToArbitrum,
      _pageNumber,
      _pageSize,
      _searchString
    ]) => {
      const cachedTransactions: Transaction[] = []

      // We need to know how many txs of each query type have been fetched so far.
      // First we get all the previous txs from cache.
      for (let prevPage = 0; prevPage < _pageNumber; prevPage++) {
        const txsFromCache = cache.get(
          unstable_serialize([
            'deposits',
            _walletAddress,
            _l1Provider,
            _l2Provider,
            _isSmartContractWallet,
            _isConnectedToArbitrum,
            prevPage,
            _pageSize,
            _searchString
          ])
        )?.data.deposits
        cachedTransactions.push(txsFromCache)
      }

      // Count txs by subgraph query type.
      const depositsQueryCount = countSubgraphQueryTypes(
        cachedTransactions.flat()
      )

      return fetchCompleteDepositData({
        walletAddress: _walletAddress,
        depositQueryTypes,
        depositsQueryCount,
        depositParams: {
          l1Provider: _l1Provider,
          l2Provider: _l2Provider,
          pageSize: _pageSize,
          searchString: _searchString
        }
      })
    }
  )
}
