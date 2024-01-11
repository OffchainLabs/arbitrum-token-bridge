import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers'
import { EthBridger, getChain, L2Network } from '@arbitrum/sdk'
import useSWRImmutable from 'swr/immutable'

import { ether } from '../constants'
import { rpcURLs } from '../util/networks'
import { fetchErc20Data, getNativeTokenLogo } from '../util/TokenUtils'

type NativeCurrencyBase = {
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
  logoUrl:
    'https://raw.githubusercontent.com/ethereum/ethereum-org-website/957567c341f3ad91305c60f7d0b71dcaebfff839/src/assets/assets/eth-diamond-black-gray.png',
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
    chain = await getChain(provider)
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
    logoUrl: getNativeTokenLogo(chain.chainID),
    symbol,
    decimals,
    address,
    isCustom: true
  }
}
