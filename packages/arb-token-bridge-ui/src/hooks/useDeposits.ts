import { useMemo } from 'react'
import useSWRImmutable from 'swr/immutable'
import { PageParams } from '../components/TransactionHistory/TransactionsTable/TransactionsTable'
import { useAppState } from '../state'
import { useAppContextState } from '../components/App/AppContext'
import { MergedTransaction } from '../state/app/state'
import { isPending, transformDeposits } from '../state/app/utils'
import {
  FetchDepositParams,
  fetchDeposits
} from '../util/deposits/fetchDeposits'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import { Transaction } from './useTransactions'
import {
  getQueryParamsForFetchingReceivedFunds,
  getQueryParamsForFetchingSentFunds
} from '../util/SubgraphUtils'

export type CompleteDepositData = {
  deposits: Transaction[]
  pendingDeposits: Transaction[]
  transformedDeposits: MergedTransaction[]
}

export const fetchCompleteDepositData = async (
  depositParams: FetchDepositParams
): Promise<CompleteDepositData> => {
  // get the original deposits
  const deposits = await fetchDeposits(depositParams)

  // filter out pending deposits
  const pendingDepositsMap = new Map<string, boolean>()
  // get their complete transformed data (so that we get their exact status)
  const completeDepositData = transformDeposits(deposits)
  completeDepositData.forEach(completeTxData => {
    if (isPending(completeTxData)) {
      pendingDepositsMap.set(completeTxData.txId, true)
    }
  })
  const pendingDeposits = deposits.filter(
    tx => typeof pendingDepositsMap.get(tx.txID) !== 'undefined'
  )

  return { deposits, pendingDeposits, transformedDeposits: completeDepositData }
}

export const useDeposits = (depositPageParams: PageParams) => {
  const { l1, l2 } = useNetworksAndSigners()

  // only change l1-l2 providers (and hence, reload deposits) when the connected chain id changes
  // otherwise tx-history unnecessarily reloads on l1<->l2 network switch as well (#847)
  const l1Provider = useMemo(() => l1.provider, [l1.network.id])
  const l2Provider = useMemo(() => l2.provider, [l2.network.id])

  const {
    layout: { isTransactionHistoryShowingSentTx }
  } = useAppContextState()

  const {
    app: {
      arbTokenBridge: { walletAddress }
    }
  } = useAppState()

  const additionalSubgraphQueryParams = isTransactionHistoryShowingSentTx
    ? getQueryParamsForFetchingSentFunds(walletAddress)
    : getQueryParamsForFetchingReceivedFunds(walletAddress)

  /* return the cached response for the complete pending transactions */
  return useSWRImmutable(
    // `walletAddress` can actually be `undefined`, so the type is wrong
    // remove comment once we switch to `useAccount`
    walletAddress
      ? [
          'deposits',
          walletAddress,
          l1Provider,
          l2Provider,
          isTransactionHistoryShowingSentTx,
          depositPageParams.pageNumber,
          depositPageParams.pageSize,
          depositPageParams.searchString
        ]
      : null,
    ([
      ,
      _walletAddress,
      _l1Provider,
      _l2Provider,
      _isTransactionHistoryShowingSentTx,
      _pageNumber,
      _pageSize,
      _searchString
    ]) =>
      fetchCompleteDepositData({
        l1Provider: _l1Provider,
        l2Provider: _l2Provider,
        pageNumber: _pageNumber,
        pageSize: _pageSize,
        searchString: _searchString,
        ...additionalSubgraphQueryParams
      })
  )
}
