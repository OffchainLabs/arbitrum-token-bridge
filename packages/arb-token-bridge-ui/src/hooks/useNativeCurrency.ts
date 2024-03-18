import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers'
import { EthBridger, L2Network, getL2Network } from '@arbitrum/sdk'
import useSWRImmutable from 'swr/immutable'

import { ETHER_TOKEN_LOGO, ether } from '../constants'
import { rpcURLs } from '../util/networks'
import { fetchErc20Data } from '../util/TokenUtils'
import { getBridgeUiConfigForChain } from '../util/bridgeUiConfig'

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
  let chain: L2Network

  try {
    chain = await getL2Network(provider)
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
  const parentChainId = chain.partnerChainID
  const parentChainProvider = new StaticJsonRpcProvider(rpcURLs[parentChainId])

  const { name, symbol, decimals } = await fetchErc20Data({
    address,
    provider: parentChainProvider
  })

  return {
    name,
    logoUrl: getBridgeUiConfigForChain(chain.chainID).nativeTokenData?.logoUrl,
    symbol,
    decimals,
    address,
    isCustom: true
  }
}
