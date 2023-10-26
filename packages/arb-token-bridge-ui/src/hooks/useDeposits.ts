import useSWRImmutable from 'swr/immutable'
import { useAccount, useChainId } from 'wagmi'

import { PageParams } from '../components/TransactionHistory/TransactionsTable/TransactionsTable'
import { MergedTransaction } from '../state/app/state'
import { isPending, transformDeposits } from '../state/app/utils'
import {
  FetchDepositParams,
  fetchDeposits
} from '../util/deposits/fetchDeposits'
import { Transaction } from './useTransactions'
import { useAccountType } from './useAccountType'
import {
  shouldIncludeSentTxs,
  shouldIncludeReceivedTxs
} from '../util/SubgraphUtils'
import { useNetworks } from './useNetworks'
import { useNetworksRelationship } from './useNetworksRelationship'

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
  const { isSmartContractWallet, isLoading: isAccountTypeLoading } =
    useAccountType()
  const [networks] = useNetworks()
  const { childProvider, parentChain, parentProvider } =
    useNetworksRelationship(networks)
  const chainId = useChainId()
  const isConnectedToParentChain = parentChain.id === chainId

  const { address: walletAddress } = useAccount()

  // SCW address is tied to a specific network
  // that's why we need to limit shown txs either to sent or received funds
  // otherwise we'd display funds for a different network, which could be someone else's account
  const includeSentTxs = isAccountTypeLoading
    ? false
    : shouldIncludeSentTxs({
        type: 'deposit',
        isSmartContractWallet,
        isConnectedToParentChain
      })

  const includeReceivedTxs = isAccountTypeLoading
    ? false
    : shouldIncludeReceivedTxs({
        type: 'deposit',
        isSmartContractWallet,
        isConnectedToParentChain
      })

  /* return the cached response for the complete pending transactions */
  return useSWRImmutable(
    walletAddress
      ? [
          'deposits',
          walletAddress,
          parentProvider,
          childProvider,
          depositPageParams.pageNumber,
          depositPageParams.pageSize,
          depositPageParams.searchString,
          isAccountTypeLoading
        ]
      : null,
    ([
      ,
      _walletAddress,
      _parentProvider,
      _childProvider,
      _pageNumber,
      _pageSize,
      _searchString
    ]) =>
      fetchCompleteDepositData({
        sender: includeSentTxs ? _walletAddress : undefined,
        receiver: includeReceivedTxs ? _walletAddress : undefined,
        l1Provider: _parentProvider,
        l2Provider: _childProvider,
        pageNumber: _pageNumber,
        pageSize: _pageSize,
        searchString: _searchString
      })
  )
}
