import { useCallback, useMemo } from 'react'
import { BigNumber, providers } from 'ethers'
import { Provider } from '@ethersproject/providers'
import useSWR, { useSWRConfig } from 'swr'

import { MultiCaller } from '@arbitrum/sdk'

import { useChainId } from './useChainId'

type Erc20Balances = {
  [address: string]: BigNumber | undefined
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
  const { mutate } = useSWRConfig()
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
  const queryKeyWithAddresses = useMemo(() => {
    const key = queryKey('erc20')
    if (!key) {
      return null
    }

    return [...key, erc20Addresses]
  }, [queryKey, erc20Addresses])

  const updateCache = useCallback(
    (newBalances: Erc20Balances) => {
      return mutate(queryKey('erc20'), newBalances, {
        populateCache(newData, currentData) {
          // Merge new data with previous one under erc20 query key
          return {
            ...currentData,
            ...newData
          }
        }
      })
    },
    [mutate, queryKey]
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

    return updateCache(balances)
  }, [updateCache, queryKey, erc20Addresses, provider, walletAddressLowercased])

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

  const { data } = useSWR(
    // Add addresses to the query key to trigger refetch whenever addresses changes
    queryKeyWithAddresses,
    fetchErc20,
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000
    }
  )

  const updateErc20 = useCallback(
    (balances: Erc20Balances) => {
      updateCache(balances)
    },
    [updateCache]
  )

  return {
    eth: [dataEth, updateEthBalance] as const,
    erc20: [data, updateErc20] as const
  }
}

export { useBalance }
