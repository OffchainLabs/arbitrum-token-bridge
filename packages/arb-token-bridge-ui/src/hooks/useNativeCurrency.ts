import { ArbitrumNetwork, EthBridger, getArbitrumNetwork } from '@arbitrum/sdk'
import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers'
import useSWRImmutable from 'swr/immutable'

import { ether, ETHER_TOKEN_LOGO } from '../constants'
import { getBridgeUiConfigForChain } from '../util/bridgeUiConfig'
import { rpcURLs } from '../util/networks'
import { fetchErc20Data } from '../util/TokenUtils'

export type NativeCurrencyBase = {
  name: string
  symbol: string
  decimals: number
  logoUrl?: string
}

export type NativeCurrencyEther = NativeCurrencyBase & {
  isCustom: false
}

export type NativeCurrencyErc20 = NativeCurrencyBase & {
  isCustom: true
  /**
   * Address of the ERC-20 token contract on the parent chain.
   */
  address: string
}

export type NativeCurrency = NativeCurrencyEther | NativeCurrencyErc20

const nativeCurrencyEther: NativeCurrencyEther = {
  ...ether,
  logoUrl: ETHER_TOKEN_LOGO,
  isCustom: false
}

export function useNativeCurrency({
  provider
}: {
  provider: Provider
}): NativeCurrency {
  const { data = nativeCurrencyEther } = useSWRImmutable(
    ['nativeCurrency', provider],
    ([, _provider]) => fetchNativeCurrency({ provider: _provider }),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000
    }
  )

  return data
}

export async function fetchNativeCurrency({
  provider
}: {
  provider: Provider
}): Promise<NativeCurrency> {
  let chain: ArbitrumNetwork

  try {
    chain = await getArbitrumNetwork(provider)
  } catch (error) {
    // This will only throw for L1s, so we can safely assume that the native currency is ETH
    return nativeCurrencyEther
  }

  const ethBridger = await EthBridger.fromProvider(provider)

  // Could be an L2 or an Orbit chain, but doesn't really matter
  if (typeof ethBridger.nativeToken === 'undefined') {
    return nativeCurrencyEther
  }

  const address = ethBridger.nativeToken.toLowerCase()
  const parentChainId = chain.parentChainId
  const parentChainProvider = new StaticJsonRpcProvider(rpcURLs[parentChainId])

  const { name, symbol, decimals } = await fetchErc20Data({
    address,
    provider: parentChainProvider
  })

  return {
    name,
    logoUrl: getBridgeUiConfigForChain(chain.chainId).nativeTokenData?.logoUrl,
    symbol,
    decimals,
    address,
    isCustom: true
  }
}
