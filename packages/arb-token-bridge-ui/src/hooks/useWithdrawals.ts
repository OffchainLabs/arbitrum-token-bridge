import { useMemo } from 'react'
import useSWRImmutable from 'swr/immutable'
import { useAccount, useChainId } from 'wagmi'

import { PageParams } from '../components/TransactionHistory/TransactionsTable/TransactionsTable'
import { MergedTransaction } from '../state/app/state'
import { isPending, transformWithdrawals } from '../state/app/utils'
import {
  FetchWithdrawalsParams,
  fetchWithdrawals
} from '../util/withdrawals/fetchWithdrawals'
import { L2ToL1EventResultPlus } from './arbTokenBridge.types'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import { useAccountType } from './useAccountType'
import { shouldShowReceivedTxs, shouldShowSentTxs } from '../util/SubgraphUtils'

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
  const { l1, l2 } = useNetworksAndSigners()
  const { isSmartContractWallet, isLoading: isAccountTypeLoading } =
    useAccountType()
  const chainId = useChainId()

  const isConnectedToParentChain = l1.network.id === chainId

  // only change l1-l2 providers (and hence, reload withdrawals) when the connected chain id changes
  // otherwise tx-history unnecessarily reloads on l1<->l2 network switch as well (#847)
  const l1Provider = useMemo(() => l1.provider, [l1.network.id])
  const l2Provider = useMemo(() => l2.provider, [l2.network.id])

  const { address: walletAddress } = useAccount()

  const showSentTxs = isAccountTypeLoading
    ? false
    : shouldShowSentTxs({
        type: 'withdrawal',
        isSmartContractWallet,
        isConnectedToParentChain
      })

  const showReceivedTxs = isAccountTypeLoading
    ? false
    : shouldShowReceivedTxs({
        type: 'withdrawal',
        isSmartContractWallet,
        isConnectedToParentChain
      })

  /* return the cached response for the complete pending transactions */
  return useSWRImmutable(
    // `walletAddress` can actually be `undefined`, so the type is wrong
    // remove comment once we switch to `useAccount`
    walletAddress
      ? [
          'withdrawals',
          walletAddress,
          l1Provider,
          l2Provider,
          withdrawalPageParams.pageNumber,
          withdrawalPageParams.pageSize,
          withdrawalPageParams.searchString,
          isAccountTypeLoading
        ]
      : null,
    ([
      ,
      _walletAddress,
      _l1Provider,
      _l2Provider,
      _pageNumber,
      _pageSize,
      _searchString
    ]) =>
      fetchCompleteWithdrawalData({
        sender: showSentTxs ? _walletAddress : undefined,
        receiver: showReceivedTxs ? _walletAddress : undefined,
        l1Provider: _l1Provider,
        l2Provider: _l2Provider,
        pageNumber: _pageNumber,
        pageSize: _pageSize,
        searchString: _searchString
      })
  )
}
