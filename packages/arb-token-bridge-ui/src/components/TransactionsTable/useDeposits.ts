import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useAppState } from '../../state'
import { fetchDeposits } from './fetchEthDepositsFromSubgraph_draft'
import { fetchWithdrawals } from 'token-bridge-sdk'
import useSWR from 'swr'
import { useGateways } from './useGateways'

export const useDeposits = ({
  searchString,
  pageNumber,
  pageSize
}: {
  searchString?: string
  pageNumber?: number
  pageSize?: number
  type?: 'ETH' | 'ERC20'
  isDeposit: boolean
}) => {
  const {
    app: {
      arbTokenBridge: { walletAddress }
    }
  } = useAppState()

  const { l1, l2 } = useNetworksAndSigners()

  const l1Provider = l1.provider,
    l2Provider = l2.provider

  return useSWR(
    [
      `deposits`,
      walletAddress,
      l1Provider,
      l2Provider,
      searchString,
      pageNumber,
      pageSize
    ],
    (
      _,
      _walletAddress,
      _l1Provider,
      _l2Provider,
      _searchString,
      _pageNumber,
      _pageSize
    ) =>
      fetchDeposits({
        address: _walletAddress,
        l1Provider: _l1Provider,
        l2Provider: _l2Provider,
        searchString: _searchString,
        pageNumber: _pageNumber,
        pageSize: _pageSize
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

export const useWithdrawals = ({
  searchString,
  pageNumber,
  pageSize
}: {
  searchString?: string
  pageNumber?: number
  pageSize?: number
}) => {
  const {
    app: {
      arbTokenBridge: { walletAddress }
    }
  } = useAppState()

  const { l1, l2 } = useNetworksAndSigners()

  const gatewaysToUse = useGateways()

  const l1Provider = l1.provider,
    l2Provider = l2.provider

  return useSWR(
    [
      'withdrawal',
      walletAddress,
      l1Provider,
      l2Provider,
      searchString,
      pageNumber,
      pageSize
    ],
    (
      _,
      _walletAddress,
      _l1Provider,
      _l2Provider,
      _searchString,
      _pageNumber,
      _pageSize
    ) =>
      fetchWithdrawals({
        address: _walletAddress,
        l1Provider: _l1Provider,
        l2Provider: _l2Provider,
        searchString: _searchString,
        pageNumber: _pageNumber,
        pageSize: _pageSize,
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
