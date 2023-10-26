import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers'
import { EthBridger, getChain } from '@arbitrum/sdk'
import useSWRImmutable from 'swr/immutable'

import { rpcURLs } from '../util/networks'
import { fetchErc20Data } from '../util/TokenUtils'

type NativeTokenBase = {
  name: string
  symbol: string
  decimals: number
  logoUrl?: string
}

export type NativeTokenEther = NativeTokenBase & {
  isCustom: false
}

export type NativeTokenCustom = NativeTokenBase & {
  isCustom: true
  address: string
}

export type NativeToken = NativeTokenEther | NativeTokenCustom

const ether: NativeToken = {
  name: 'Ether',
  symbol: 'ETH',
  decimals: 18,
  logoUrl:
    'https://raw.githubusercontent.com/ethereum/ethereum-org-website/957567c341f3ad91305c60f7d0b71dcaebfff839/src/assets/assets/eth-diamond-black-gray.png',
  isCustom: false
}

export function useNativeToken({
  provider
}: {
  provider: Provider
}): NativeToken {
  const { data = ether } = useSWRImmutable(
    ['nativeToken', provider],
    ([, _provider]) => fetchNativeToken(_provider),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000
    }
  )

  return data
}

async function fetchNativeToken(provider: Provider): Promise<NativeToken> {
  const chain = await getChain(provider)
  const ethBridger = await EthBridger.fromProvider(provider)

  if (typeof ethBridger.nativeToken === 'undefined') {
    return ether
  }

  const address = ethBridger.nativeToken.toLowerCase()
  const parentChainId = chain.partnerChainID
  const parentChainProvider = new StaticJsonRpcProvider(rpcURLs[parentChainId])

  const { name, symbol, decimals } = await fetchErc20Data({
    address,
    provider: parentChainProvider
  })

  return { name, symbol, decimals, address, isCustom: true }
}
