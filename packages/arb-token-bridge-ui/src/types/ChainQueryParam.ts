import { Chain } from 'wagmi'
import * as chains from 'wagmi/chains'

import { ChainId } from '../util/networks'
import * as customChains from '../util/wagmi/wagmiAdditionalNetworks'

const chainQueryParams = [
  'ethereum',
  'goerli',
  'sepolia',
  'arbitrum-one',
  'arbitrum-nova',
  'arbitrum-goerli',
  'arbitrum-sepolia',
  'stylus-testnet',
  'xai-testnet'
] as const

export type ChainQueryParam = (typeof chainQueryParams)[number]

export function isValidChainQueryParam(
  value: string
): value is ChainQueryParam {
  return (chainQueryParams as readonly string[]).includes(value)
}

export function getChainQueryParamForChain(chainId: ChainId): ChainQueryParam {
  switch (chainId) {
    case ChainId.Ethereum:
      return 'ethereum'

    case ChainId.Goerli:
      return 'goerli'

    case ChainId.ArbitrumOne:
      return 'arbitrum-one'

    case ChainId.ArbitrumNova:
      return 'arbitrum-nova'

    case ChainId.ArbitrumGoerli:
      return 'arbitrum-goerli'

    case ChainId.StylusTestnet:
      return 'stylus-testnet'

    case ChainId.XaiTestnet:
      return 'xai-testnet'

    case ChainId.Sepolia:
      return 'sepolia'

    case ChainId.ArbitrumSepolia:
      return 'arbitrum-sepolia'

    default:
      throw new Error(
        `[getChainQueryParamForChain] Unexpected chain id: ${chainId}`
      )
  }
}

export function getChainForChainQueryParam(value: ChainQueryParam): Chain {
  switch (value) {
    case 'ethereum':
      return chains.mainnet

    case 'goerli':
      return chains.goerli

    case 'sepolia':
      return chains.sepolia

    case 'arbitrum-one':
      return chains.arbitrum

    case 'arbitrum-nova':
      return customChains.arbitrumNova

    case 'arbitrum-goerli':
      return chains.arbitrumGoerli

    case 'arbitrum-sepolia':
      return customChains.arbitrumSepolia

    case 'stylus-testnet':
      return customChains.stylusTestnet

    case 'xai-testnet':
      return customChains.xaiTestnet
  }
}
