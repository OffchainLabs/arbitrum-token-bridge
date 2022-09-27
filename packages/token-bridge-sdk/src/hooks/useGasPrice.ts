import { useEffect, useMemo, useState } from 'react'
import { BigNumber, providers } from 'ethers'
import useSWR from 'swr'

async function tryFetchGasPrice({
  provider
}: {
  provider: providers.Provider
}) {
  try {
    return await provider.getGasPrice()
  } catch (error) {
    return BigNumber.from(0)
  }
}

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
    () => tryFetchGasPrice({ provider }),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 5_000
    }
  )

  return gasPrice
}
