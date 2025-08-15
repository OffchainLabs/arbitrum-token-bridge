import { useMemo } from 'react'
import { BigNumber } from 'ethers'
import useSWRImmutable from 'swr/immutable'
import { getSupportedChainIds, getChains } from '../util/networks'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { captureSentryErrorWithExtraData } from '../util/SentryUtils'
import { fetchErc20Data } from '../util/TokenUtils'
import { ChainWithRpcUrl } from '../util/networks'
import { useIsTestnetMode } from './useIsTestnetMode'

type BalanceState = {
  loading: boolean
  error: Error | null
  value: {
    balance: BigNumber
    decimals: number
    symbol: string
  } | null
}

type NativeCurrencyBalances = {
  [chainId: number]: BalanceState
}

const fetchNativeBalance = async (
  chainId: number,
  walletAddress: string
): Promise<{ balance: BigNumber; decimals: number; symbol: string }> => {
  try {
    const provider = getProviderForChainId(chainId)

    // Get balance
    const balance = await provider.getBalance(walletAddress)

    // Get symbol from chain data
    const chains = getChains()
    const chain = chains.find(c => c.chainId === chainId) as
      | ChainWithRpcUrl
      | undefined

    if (!chain) {
      throw new Error(`Chain not found for chainId ${chainId}`)
    }

    // Get decimals on-chain
    let decimals: number, symbol: string
    if (chain.nativeToken) {
      // For custom native tokens, use the parent chain provider to get decimals
      const parentChainProvider = getProviderForChainId(chain.parentChainId)
      const nativeTokenData = await fetchErc20Data({
        address: chain.nativeToken,
        provider: parentChainProvider
      })
      decimals = nativeTokenData.decimals
      symbol = nativeTokenData.symbol
    } else {
      // For standard ETH, use 18 decimals
      decimals = 18
      symbol = 'ETH'
    }

    return {
      balance,
      decimals,
      symbol
    }
  } catch (error) {
    captureSentryErrorWithExtraData({
      error: error as Error,
      originFunction:
        'useNativeCurrencyBalancesAcrossAllChains fetchNativeBalance',
      additionalData: {
        chain_id: chainId.toString(),
        wallet_address: walletAddress
      }
    })
    throw error
  }
}

// Custom hook for individual chain balance
const useChainBalance = (chainId: number, walletAddress?: string) => {
  const { data, error, isLoading } = useSWRImmutable(
    walletAddress
      ? [`native-balance-${chainId}`, walletAddress, chainId]
      : null,
    ([, _walletAddress, _chainId]: [string, string, number]) =>
      fetchNativeBalance(_chainId, _walletAddress),
    {
      refreshInterval: 30_000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 3_000,
      revalidateOnFocus: false
    }
  )

  return {
    loading: isLoading,
    error: error || null,
    value: data || null
  }
}

export const useNativeCurrencyBalancesAcrossAllChains = (
  walletAddress?: string
) => {
  const [isTestnetMode] = useIsTestnetMode()

  const supportedChainIds = useMemo(() => {
    return getSupportedChainIds({
      includeMainnets: !isTestnetMode,
      includeTestnets: isTestnetMode
    })
  }, [isTestnetMode])

  // Create individual balance hooks for each chain
  const chainBalances = supportedChainIds.map(chainId => ({
    chainId,
    balance: useChainBalance(chainId, walletAddress)
  }))

  const nativeCurrencyBalances = useMemo(() => {
    const balances: NativeCurrencyBalances = {}

    chainBalances.forEach(({ chainId, balance }) => {
      balances[chainId] = balance
    })

    return balances
  }, [chainBalances])

  return { nativeCurrencyBalances }
}
