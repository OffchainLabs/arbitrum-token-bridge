import { useEffect, useMemo, useState } from 'react'
import { BigNumber, providers } from 'ethers'
import useSWR from 'swr'

export function useGasPrice({
  provider
}: {
  provider: providers.Provider
}): BigNumber {
  const [chainId, setChainId] = useState<number | null>(null)

  useEffect(() => {
    async function updateChainId() {
      setChainId((await provider.getNetwork()).chainId)
    }

    updateChainId()
  }, [provider])

  const queryKey = useMemo(() => {
    if (chainId === null) {
      // Don't fetch
      return null
    }

    return ['gasPrice', chainId]
  }, [chainId])

  const { data: gasPrice = BigNumber.from(0) } = useSWR(
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
