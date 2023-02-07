import { Provider } from '@ethersproject/providers'
import dayjs from 'dayjs'
import {
  fetchDeposits,
  fetchWithdrawals,
  OutgoingMessageState
} from 'token-bridge-sdk'
import {
  outgoungStateToString,
  transformDeposits,
  transformWithdrawals
} from '../state/app/utils'
import useSWR from 'swr'
import { useNetworksAndSigners } from '../hooks/useNetworksAndSigners'
import { useAppState } from '../state'
import { useGateways } from './useGateways'
import { DepositStatus } from '../state/app/state'

const INITIAL_PAGE_SIZE = 10

export const fetchPendingTransactions = async ({
  walletAddress,
  l1Provider,
  l2Provider,
  gatewayAddresses,
  pageSize = INITIAL_PAGE_SIZE
}: {
  walletAddress: string
  l1Provider: Provider
  l2Provider: Provider
  gatewayAddresses: string[]
  pageNumber?: number
  pageSize?: number
  searchString?: string
}) => {
  // fetch the first 100 deposits
  const deposits = await fetchDeposits({
    walletAddress,
    l1Provider,
    l2Provider,
    pageNumber: 0,
    pageSize
  })

  // fetch the first 100 withdrawals
  const withdrawals = await fetchWithdrawals({
    walletAddress,
    l1Provider,
    l2Provider,
    pageNumber: 0,
    pageSize,
    gatewayAddresses
  })

  // filter out pending deposits
  const pendingDepositsMap: { [id: string]: boolean } = {}
  // get their complete transformed data (so that we get their exact status)
  const completeDepositData = transformDeposits(deposits)
  completeDepositData.forEach(completeTxData => {
    if (
      completeTxData &&
      completeTxData.depositStatus !== DepositStatus.L2_SUCCESS
    ) {
      pendingDepositsMap[completeTxData.txId] = true
    }
  })
  const pendingDeposits = deposits.filter(tx => pendingDepositsMap[tx.txID])

  // filter out pending withdrawals
  const pendingWithdrawalMap: { [id: string]: boolean } = {}
  const completeWithdrawalData = transformWithdrawals(withdrawals)
  completeWithdrawalData.forEach(completeTxData => {
    if (
      completeTxData &&
      completeTxData.status !==
        outgoungStateToString[OutgoingMessageState.EXECUTED]
    ) {
      pendingWithdrawalMap[String(completeTxData.txId)] = true
    }
  })
  const pendingWithdrawals = withdrawals.filter(
    tx => pendingWithdrawalMap[tx.l2TxHash!]
  )

  // merge those 2 and return back in 1 array which can be

  const pendingMergedTransactions = [
    ...completeDepositData,
    ...completeWithdrawalData
  ].sort((a, b) => {
    const creationDateA = dayjs(a.createdAt, 'MMM DD, YYYY hh:mm A')
    const creationDateB = dayjs(b.createdAt, 'MMM DD, YYYY hh:mm A')

    return dayjs(creationDateA).isBefore(creationDateB) ? 1 : -1
  })

  return { pendingDeposits, pendingWithdrawals, pendingMergedTransactions }
}

export const usePendingTransactions = () => {
  const { l1, l2 } = useNetworksAndSigners()
  const gatewaysToUse = useGateways()

  const l1Provider = l1.provider
  const l2Provider = l2.provider

  const {
    app: {
      arbTokenBridge: { walletAddress }
    }
  } = useAppState()

  /* return the cached response for the complete pending transactions */
  return useSWR(
    ['pendingTxns', walletAddress, l1Provider, l2Provider, gatewaysToUse],
    (_, _walletAddress, _l1Provider, _l2Provider) =>
      fetchPendingTransactions({
        walletAddress: _walletAddress,
        l1Provider: _l1Provider,
        l2Provider: _l2Provider,
        gatewayAddresses: gatewaysToUse
      }),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  )
}
