import { useMemo } from 'react'
import useSWRImmutable from 'swr/immutable'
import { useAccount, useChainId } from 'wagmi'

import { PageParams } from '../components/TransactionHistory/TransactionsTable/TransactionsTable'
import { MergedTransaction } from '../state/app/state'
import {
  isPending,
  transformDeposits,
  transformWithdrawals
} from '../state/app/utils'
import {
  FetchWithdrawalsParams,
  fetchWithdrawals
} from '../util/withdrawals/fetchWithdrawals'
import { L2ToL1EventResultPlus } from './arbTokenBridge.types'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import { useAccountType } from './useAccountType'
import {
  shouldIncludeSentTxs,
  shouldIncludeReceivedTxs
} from '../util/SubgraphUtils'
import { Transaction } from './useTransactions'
import {
  FetchDepositParams,
  fetchDeposits
} from '../util/deposits/fetchDeposits'
import { SWRResponse } from 'swr'

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

export const useFetchedTransactions = <Type extends 'deposit' | 'withdrawal'>({
  type,
  pageParams
}: {
  type: Type
  pageParams: PageParams
}): SWRResponse<
  Type extends 'deposit' ? CompleteDepositData : CompleteWithdrawalData
> => {
  const { l1, l2 } = useNetworksAndSigners()
  const { isSmartContractWallet, isLoading: isAccountTypeLoading } =
    useAccountType()
  const chainId = useChainId()

  const isConnectedToParentChain = l1.network.id === chainId

  // only change l1-l2 providers (and hence, reload deposits) when the connected chain id changes
  // otherwise tx-history unnecessarily reloads on l1<->l2 network switch as well (#847)
  const l1Provider = useMemo(() => l1.provider, [l1.network.id])
  const l2Provider = useMemo(() => l2.provider, [l2.network.id])

  const { address: walletAddress } = useAccount()

  // SCW address is tied to a specific network
  // that's why we need to limit shown txs either to sent or received funds
  // otherwise we'd display funds for a different network, which could be someone else's account
  const includeSentTxs = isAccountTypeLoading
    ? false
    : shouldIncludeSentTxs({
        type,
        isSmartContractWallet,
        isConnectedToParentChain
      })

  const includeReceivedTxs = isAccountTypeLoading
    ? false
    : shouldIncludeReceivedTxs({
        type,
        isSmartContractWallet,
        isConnectedToParentChain
      })

  type SWRReturnType = Type extends 'deposit'
    ? CompleteDepositData
    : CompleteWithdrawalData

  /* return the cached response for the complete pending transactions */
  return useSWRImmutable(
    // `walletAddress` can actually be `undefined`, so the type is wrong
    // remove comment once we switch to `useAccount`
    walletAddress
      ? [
          type,
          walletAddress,
          l1Provider,
          l2Provider,
          pageParams.pageNumber,
          pageParams.pageSize,
          pageParams.searchString,
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
    ]): Promise<SWRReturnType> => {
      const params = {
        sender: includeSentTxs ? _walletAddress : undefined,
        receiver: includeReceivedTxs ? _walletAddress : undefined,
        l1Provider: _l1Provider,
        l2Provider: _l2Provider,
        pageNumber: _pageNumber,
        pageSize: _pageSize,
        searchString: _searchString
      }

      return type === 'deposit'
        ? (fetchCompleteDepositData(params) as Promise<SWRReturnType>)
        : (fetchCompleteWithdrawalData(params) as Promise<SWRReturnType>)
    }
  )
}
