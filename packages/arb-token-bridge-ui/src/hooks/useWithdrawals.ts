import useSWRImmutable from 'swr/immutable'
import { L2ToL1EventResultPlus } from 'token-bridge-sdk'
import { PageParams } from '../components/TransactionHistory/TransactionsTable/TransactionsTable'
import { useAppState } from '../state'
import { MergedTransaction } from '../state/app/state'
import { isPending, transformWithdrawals } from '../state/app/utils'
import {
  FetchWithdrawalsParams,
  fetchWithdrawals
} from '../util/withdrawals/fetchWithdrawals'
import { useL2Gateways } from './useL2Gateways'
import { useNetworksAndSigners } from './useNetworksAndSigners'

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

  const l1Provider = l1.provider
  const l2Provider = l2.provider

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
        l1Provider: _l1Provider,
        l2Provider: _l2Provider,
        gatewayAddresses: _gatewayAddresses,
        pageNumber: _pageNumber,
        pageSize: _pageSize,
        searchString: _searchString
      })
  )
}
