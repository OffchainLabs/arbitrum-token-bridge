import { useMemo } from 'react'
import { BigNumber, constants, providers } from 'ethers'
import useSWR from 'swr'

import { useChainId } from './useChainId'

export function useGasPrice({
  provider
}: {
  provider: providers.Provider
}): BigNumber {
  const chainId = useChainId({ provider })

  const queryKey = useMemo(() => {
    if (typeof chainId === 'undefined') {
      // Don't fetch
      return null
    }

    return ['gasPrice', chainId]
  }, [chainId])

  const { data: gasPrice = constants.Zero } = useSWR(
    queryKey,
    () => provider.getGasPrice(),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  return gasPrice
}
