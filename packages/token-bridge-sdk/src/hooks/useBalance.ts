import { useCallback, useMemo } from 'react'
import { providers } from 'ethers'
import useSWR from 'swr'

import { useChainId } from './useChainId'

const useBalance = ({
  provider,
  walletAddress
}: {
  provider: providers.Provider
  walletAddress: string | undefined
}) => {
  const chainId = useChainId({ provider })
  const walletAddressLowercased = useMemo(
    () => walletAddress?.toLowerCase(),
    [walletAddress]
  )

  const queryKey = useCallback(
    (type: 'eth' | 'erc20') => {
      if (
        typeof chainId === 'undefined' ||
        typeof walletAddressLowercased === 'undefined'
      ) {
        // Don't fetch
        return null
      }

      return [type, chainId, walletAddressLowercased, 'balance']
    },
    [chainId, walletAddressLowercased]
  )

  const config = useMemo(
    () => ({
      refreshInterval: 15_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000
    }),
    []
  )

  const { data: dataEth, mutate: mutateEth } = useSWR(
    queryKey('eth'),
    (_, __, _walletAddress: string) => provider.getBalance(_walletAddress),
    config
  )

  return {
    eth: [dataEth ?? null, mutateEth] as const
  }
}

export { useBalance }
