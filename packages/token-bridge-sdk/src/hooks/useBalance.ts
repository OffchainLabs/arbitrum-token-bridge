import { useCallback, useEffect, useMemo } from 'react'
import { BigNumber, providers } from 'ethers'
import { Provider } from '@ethersproject/providers'
import useSWR, { useSWRConfig, unstable_serialize, Middleware } from 'swr'

import { MultiCaller } from '@arbitrum/sdk'

import { useChainId } from './useChainId'

type Erc20Balances = {
  [address: string]: BigNumber | undefined
}

const merge: Middleware = useSWRNext => {
  return (key, fetcher, config) => {
    const { cache } = useSWRConfig()

    const extendedFetcher = async (...args) => {
      const newBalances = await fetcher(...args)
      const oldData = cache.get(unstable_serialize(key))
      return {
        ...oldData,
        ...newBalances
      }
    }

    return useSWRNext(key, extendedFetcher, config)
  }
}

const useBalance = ({
  provider,
  walletAddress,
  erc20Addresses
}: {
  provider: providers.Provider
  walletAddress: string | undefined
  erc20Addresses?: string[]
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

      return [chainId, walletAddressLowercased, 'balance', type] as const
    },
    [chainId, walletAddressLowercased]
  )
  const fetchErc20 = useCallback(async () => {
    if (!queryKey('erc20') || !erc20Addresses) {
      return {}
    }

    const multiCaller = await MultiCaller.fromProvider(provider as Provider)
    const addressesBalances = await multiCaller.getTokenData(erc20Addresses, {
      balanceOf: { account: walletAddressLowercased! }
    })

    const balances = erc20Addresses.reduce((acc, address, index) => {
      acc[address] = addressesBalances[index].balance
      return acc
    }, {} as { [address: string]: BigNumber | undefined })

    return balances
  }, [queryKey, erc20Addresses, provider, walletAddressLowercased])

  const { data: dataEth = null, mutate: updateEthBalance } = useSWR(
    queryKey('eth'),
    (_, _walletAddress) => provider.getBalance(_walletAddress),
    {
      refreshInterval: 15_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000
    }
  )

  const { data = null, mutate: mutateErc20 } = useSWR(
    queryKey('erc20'),
    fetchErc20,
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000,
      use: [merge]
    }
  )

  const updateErc20 = useCallback(
    async (balances: Erc20Balances) => {
      return mutateErc20(balances, {
        populateCache(result, currentData) {
          return {
            ...currentData,
            ...result
          }
        }
      })
    },
    [mutateErc20]
  )

  // Refetch whenever erc20Addresses change
  useEffect(() => {
    const refetchErc20 = async () => {
      const newBalances = await fetchErc20()
      updateErc20(newBalances)
    }

    refetchErc20()
  }, [updateErc20, fetchErc20, erc20Addresses])

  return {
    eth: [dataEth, updateEthBalance] as const,
    erc20: [data, updateErc20] as const
  }
}

export { useBalance }
