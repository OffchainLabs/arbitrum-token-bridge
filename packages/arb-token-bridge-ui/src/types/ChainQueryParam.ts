import { Chain } from 'wagmi'
import * as chains from 'wagmi/chains'

import { ChainId } from '../util/networks'
import * as customChains from '../util/wagmi/wagmiAdditionalNetworks'

const chainQueryParams = [
  'mainnet',
  'goerli',
  'arbitrumOne',
  'arbitrumNova',
  'arbitrumGoerli'
] as const

export type ChainQueryParam = (typeof chainQueryParams)[number]

export function isValidChainQueryParam(
  value: string
): value is ChainQueryParam {
  return (chainQueryParams as readonly string[]).includes(value)
}

export function getChainQueryParamForChain(value: Chain): ChainQueryParam {
  switch (value.id) {
    case ChainId.Mainnet:
      return 'mainnet'

    case ChainId.Goerli:
      return 'goerli'

    case ChainId.ArbitrumOne:
      return 'arbitrumOne'

    case ChainId.ArbitrumNova:
      return 'arbitrumNova'

    case ChainId.ArbitrumGoerli:
      return 'arbitrumGoerli'

    default:
      throw new Error(
        `[getChainQueryParamForChain] Unexpected chain id: ${value.id}`
      )
  }
}

export function getChainForChainQueryParam(value: ChainQueryParam): Chain {
  switch (value) {
    case 'mainnet':
      return chains.mainnet

    case 'goerli':
      return chains.goerli

    case 'arbitrumOne':
      return chains.arbitrum

    case 'arbitrumNova':
      return customChains.arbitrumNova

    case 'arbitrumGoerli':
      return chains.arbitrumGoerli
  }
}
