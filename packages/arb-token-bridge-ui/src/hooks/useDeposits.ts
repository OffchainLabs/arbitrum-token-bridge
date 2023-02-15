import useSWRImmutable from 'swr/immutable'
import {
  fetchDeposits,
  FetchDepositParams,
  Transaction
} from 'token-bridge-sdk'
import { PageParams } from '../components/TransactionHistory/TransactionsTable/TransactionsTable'
import { useAppState } from '../state'
import { DepositStatus, MergedTransaction } from '../state/app/state'
import { transformDeposits } from '../state/app/utils'
import { useNetworksAndSigners } from './useNetworksAndSigners'

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
    if (
      completeTxData &&
      completeTxData.depositStatus !== DepositStatus.L2_SUCCESS
    ) {
      pendingDepositsMap.set(completeTxData.txId, true)
    }
  })
  const pendingDeposits = deposits.filter(tx => pendingDepositsMap.get(tx.txID))

  return { deposits, pendingDeposits, transformedDeposits: completeDepositData }
}

export const useDeposits = (depositPageParams: PageParams) => {
  const { l1, l2 } = useNetworksAndSigners()

  const l1Provider = l1.provider
  const l2Provider = l2.provider

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
      ...Object.values(depositPageParams || {})
    ],
    (_, _walletAddress, _l1Provider, _l2Provider) =>
      fetchCompleteDepositData({
        walletAddress: _walletAddress,
        l1Provider: _l1Provider,
        l2Provider: _l2Provider,
        ...depositPageParams
      })
  )
}
