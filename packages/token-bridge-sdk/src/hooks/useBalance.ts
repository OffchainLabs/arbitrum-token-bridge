import { useMemo } from 'react'
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

  const queryKey = useMemo(() => {
    if (
      typeof chainId === 'undefined' ||
      typeof walletAddressLowercased === 'undefined'
    ) {
      // Don't fetch
      return null
    }

    return [chainId, walletAddressLowercased, 'ethBalance']
  }, [chainId, walletAddressLowercased])

  const { data: dataEth = null, mutate: mutateEth } = useSWR(
    queryKey,
    (_, _walletAddress: string) => provider.getBalance(_walletAddress),
    {
      refreshInterval: 15_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000
    }
  )

  return {
    eth: [dataEth, mutateEth] as const
  }
}

export { useBalance }
