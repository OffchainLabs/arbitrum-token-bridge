import { Provider } from '@ethersproject/providers'
import dayjs from 'dayjs'
import { fetchWithdrawals, OutgoingMessageState } from 'token-bridge-sdk'
import { transformDeposits, transformWithdrawals } from '../../state/app/utils'
import { fetchDeposits } from './fetchEthDepositsFromSubgraph_draft'
import useSWR from 'swr'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useAppState } from '../../state'
import {
  l2DaiGatewayAddresses,
  l2LptGatewayAddresses,
  l2wstETHGatewayAddresses
} from '../../util/networks'

const INITIAL_PAGE_SIZE = 10

export const fetchPendingTransactions = async ({
  address,
  l1Provider,
  l2Provider,
  gatewayAddresses,
  pageSize = INITIAL_PAGE_SIZE
}: {
  address: string
  l1Provider: Provider
  l2Provider: Provider
  gatewayAddresses: string[]
  pageNumber?: number
  pageSize?: number
  searchString?: string
}) => {
  console.log('***** START: fetching pending transactions *****')
  // fetch the first 100 deposits
  const deposits = await fetchDeposits({
    address,
    l1Provider,
    l2Provider,
    pageNumber: 0,
    pageSize
  })
  console.log('***** fetched pending deposits *****')

  console.log('***** fetching pending withdrawals *****')
  // fetch the first 100 withdrawals
  const withdrawals = await fetchWithdrawals({
    address,
    l1Provider,
    l2Provider,
    pageNumber: 0,
    pageSize,
    gatewayAddresses
  })
  console.log('***** fetched pending withdrawals *****')

  // filter out pending deposits
  const pendingDeposits = deposits.filter(tx => tx.status === 'pending')

  // filter out pending withdrawals
  const pendingWithrawals = withdrawals.filter(
    tx => tx.outgoingMessageState !== OutgoingMessageState.EXECUTED
  )

  // merge those 2 and return back in 1 array which can be
  const completeDepositData = transformDeposits(pendingDeposits)
  const completeWithdrawalData = transformWithdrawals(pendingWithrawals)

  console.log('***** transformed both deposits and withdrawals *****')
  const finalMergedTransactions = [
    ...completeDepositData,
    ...completeWithdrawalData
  ].sort((a, b) => {
    const creationDateA = dayjs(a.createdAt, 'MMM DD, YYYY hh:mm A')
    const creationDateB = dayjs(b.createdAt, 'MMM DD, YYYY hh:mm A')

    return dayjs(creationDateA).isBefore(creationDateB) ? 1 : -1
  })

  console.log('***** FINISH! returning sorted pending transactions *****')
  return finalMergedTransactions
}

export const usePendingTransactions = () => {
  const { l1, l2 } = useNetworksAndSigners()
  const l1Provider = l1.provider
  const l2Provider = l2.provider

  const {
    app: {
      arbTokenBridge: { walletAddress }
    }
  } = useAppState()

  /* configure gateway addresses for fetching withdrawals */
  const { l2ERC20Gateway, l2CustomGateway, l2WethGateway } =
    l2.network.tokenBridge
  const gatewaysToUse = [l2ERC20Gateway, l2CustomGateway, l2WethGateway]
  const l2DaiGateway = l2DaiGatewayAddresses[l2.network.chainID]
  const l2wstETHGateway = l2wstETHGatewayAddresses[l2.network.chainID]
  const l2LptGateway = l2LptGatewayAddresses[l2.network.chainID]
  if (l2DaiGateway) {
    gatewaysToUse.push(l2DaiGateway)
  }
  if (l2wstETHGateway) {
    gatewaysToUse.push(l2wstETHGateway)
  }
  if (l2LptGateway) {
    gatewaysToUse.push(l2LptGateway)
  }

  /* return the cached response for the complete pending transactions */
  return useSWR(
    [
      'pendingTxns',
      walletAddress,
      // currentL1BlockNumber,
      l1Provider,
      l2Provider
    ],
    (_, _walletAddress, _l1Provider, _l2Provider) =>
      fetchPendingTransactions({
        address: _walletAddress,
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
