import { useCallback, useMemo } from 'react'
import { BigNumber, utils } from 'ethers'
import { useAccount } from 'wagmi'
import { Provider } from '@ethersproject/abstract-provider'
import useSWR, {
  useSWRConfig,
  unstable_serialize,
  Middleware,
  SWRHook
} from 'swr'
import { MultiCaller } from '@arbitrum/sdk'
import * as Sentry from '@sentry/react'

import { useChainId } from './useChainId'

type Erc20Balances = {
  [address: string]: BigNumber | undefined
}

export type UseBalanceProps = {
  provider: Provider
  walletAddress: string | undefined
}

const merge: Middleware = (useSWRNext: SWRHook) => {
  return (key, fetcher, config) => {
    const { cache } = useSWRConfig()

    const extendedFetcher = async () => {
      if (!fetcher) {
        return
      }
      const newBalances = await fetcher(key)
      const oldData = cache.get(unstable_serialize(key))?.data
      return {
        ...(oldData || {}),
        ...newBalances
      }
    }

    return useSWRNext(key, extendedFetcher, config)
  }
}

const useBalance = ({ provider, walletAddress }: UseBalanceProps) => {
  const chainId = useChainId({ provider })
  const { address: connectedWalletAddress } = useAccount()

  const walletAddressLowercased = useMemo(() => {
    // use balances for the passed wallet address only if it's valid
    if (utils.isAddress(String(walletAddress))) {
      return walletAddress?.toLowerCase()
    }
    // otherwise use the connected wallet address
    return connectedWalletAddress?.toLowerCase()
  }, [walletAddress, connectedWalletAddress])

  const queryKey = useCallback(
    (type: 'eth' | 'erc20') => {
      if (
        typeof chainId === 'undefined' ||
        typeof walletAddressLowercased === 'undefined'
      ) {
        // Don't fetch
        return null
      }

      return [walletAddressLowercased, chainId, 'balance', type] as const
    },
    [chainId, walletAddressLowercased]
  )
  const fetchErc20 = useCallback(
    async (_addresses: string[] | undefined) => {
      if (
        typeof walletAddressLowercased === 'undefined' ||
        !_addresses?.length
      ) {
        return {}
      }

      try {
        const multiCaller = await MultiCaller.fromProvider(provider)
        const addressesBalances = await multiCaller.getTokenData(_addresses, {
          balanceOf: { account: walletAddressLowercased }
        })

        return _addresses.reduce((acc, address, index) => {
          const balance = addressesBalances[index]
          if (balance) {
            acc[address.toLowerCase()] = balance.balance
          }

          return acc
        }, {} as Erc20Balances)
      } catch (error) {
        // log some extra info on sentry in case multi-caller fails
        Sentry.configureScope(function (scope) {
          scope.setExtra('token_addresses', _addresses)
          Sentry.captureException(error)
        })
        return {}
      }
    },
    [provider, walletAddressLowercased]
  )

  const { data: dataEth = null, mutate: updateEthBalance } = useSWR(
    queryKey('eth'),
    ([_walletAddress]) => provider.getBalance(_walletAddress),
    {
      refreshInterval: 15_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000
    }
  )
  const { data: dataErc20 = null, mutate: mutateErc20 } = useSWR(
    queryKey('erc20'),
    () => fetchErc20([]),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000,
      use: [merge]
    }
  )

  const updateErc20 = useCallback(
    async (addresses: string[]) => {
      const balances = await fetchErc20(addresses)

      return mutateErc20(balances, {
        populateCache(result, currentData) {
          return {
            ...currentData,
            ...result
          }
        },
        revalidate: false
      })
    },
    [fetchErc20, mutateErc20]
  )

  return {
    eth: [dataEth, updateEthBalance] as const,
    erc20: [dataErc20, updateErc20] as const
  }
}

export { useBalance }
