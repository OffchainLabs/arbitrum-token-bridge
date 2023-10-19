import useSWRImmutable from 'swr/immutable'
import { useAccount } from 'wagmi'

import { PageParams } from '../components/TransactionHistory/TransactionsTable/TransactionsTable'
import { MergedTransaction } from '../state/app/state'
import { isPending, transformWithdrawals } from '../state/app/utils'
import {
  FetchWithdrawalsParams,
  fetchWithdrawals
} from '../util/withdrawals/fetchWithdrawals'
import { L2ToL1EventResultPlus } from './arbTokenBridge.types'
import { useAppContextState } from '../components/App/AppContext'
import {
  getQueryParamsForFetchingReceivedFunds,
  getQueryParamsForFetchingSentFunds
} from '../util/SubgraphUtils'
import { useNetworks } from './useNetworks'
import { useNetworksRelationship } from './useNetworksRelationship'

export type CompleteWithdrawalData = {
  withdrawals: L2ToL1EventResultPlus[]
  pendingWithdrawals: L2ToL1EventResultPlus[]
  transformedWithdrawals: MergedTransaction[]
}

const fetchCompleteWithdrawalData = async (
  params: FetchWithdrawalsParams
): Promise<CompleteWithdrawalData> => {
  // get the original deposits
  const withdrawals = await fetchWithdrawals(params)

  // filter out pending withdrawals
  const pendingWithdrawalMap = new Map<string, boolean>()
  const completeWithdrawalData = transformWithdrawals(
    withdrawals.sort((msgA, msgB) => +msgB.timestamp - +msgA.timestamp)
  )

  completeWithdrawalData.forEach(completeTxData => {
    if (isPending(completeTxData)) {
      pendingWithdrawalMap.set(completeTxData.txId, true)
    }
  })
  const pendingWithdrawals = withdrawals.filter(
    tx =>
      tx.l2TxHash &&
      typeof pendingWithdrawalMap.get(tx.l2TxHash) !== 'undefined'
  )

  return {
    withdrawals,
    pendingWithdrawals,
    transformedWithdrawals: completeWithdrawalData
  }
}

export const useWithdrawals = (withdrawalPageParams: PageParams) => {
  const [networks] = useNetworks()
  const { parentProvider, childProvider } = useNetworksRelationship(networks)

  const {
    layout: { isTransactionHistoryShowingSentTx }
  } = useAppContextState()

  const { address: walletAddress } = useAccount()

  /* return the cached response for the complete pending transactions */
  return useSWRImmutable(
    // `walletAddress` can actually be `undefined`, so the type is wrong
    // remove comment once we switch to `useAccount`
    walletAddress
      ? [
          'withdrawals',
          walletAddress,
          parentProvider,
          childProvider,
          isTransactionHistoryShowingSentTx,
          withdrawalPageParams.pageNumber,
          withdrawalPageParams.pageSize,
          withdrawalPageParams.searchString
        ]
      : null,
    ([
      ,
      _walletAddress,
      _parentProvider,
      _childProvider,
      _isTransactionHistoryShowingSentTx,
      _pageNumber,
      _pageSize,
      _searchString
    ]) =>
      fetchCompleteWithdrawalData({
        l1Provider: _parentProvider,
        l2Provider: _childProvider,
        pageNumber: _pageNumber,
        pageSize: _pageSize,
        searchString: _searchString,
        ...(_isTransactionHistoryShowingSentTx
          ? getQueryParamsForFetchingSentFunds(_walletAddress)
          : getQueryParamsForFetchingReceivedFunds(_walletAddress))
      })
  )
}
