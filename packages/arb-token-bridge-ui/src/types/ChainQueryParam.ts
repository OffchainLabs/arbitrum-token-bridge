import { Chain } from 'wagmi'
import * as chains from 'wagmi/chains'

import {
  ChainId,
  getCustomChainsFromLocalStorage,
  getSupportedNetworks
} from '../util/networks'
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
  'xai-testnet',
  'local',
  'arbitrum-local'
] as const

export type ChainKeyQueryParam = (typeof chainQueryParams)[number]
export type ChainQueryParam = ChainKeyQueryParam | ChainId | number

export function isValidChainQueryParam(value: string | number): boolean {
  if (typeof value === 'string') {
    return (chainQueryParams as readonly string[]).includes(value)
  }

  const supportedNetworkIds = getSupportedNetworks(value, true)
  return supportedNetworkIds.includes(value)
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

    case ChainId.Local:
      return 'local'

    case ChainId.ArbitrumLocal:
      return 'arbitrum-local'

    default:
      const customChains = getCustomChainsFromLocalStorage()
      const customChain = customChains.find(
        customChain => customChain.chainID === chainId
      )

      if (customChain) {
        return customChain.chainID
      }

      throw new Error(
        `[getChainQueryParamForChain] Unexpected chain id: ${chainId}`
      )
  }
}

export function getChainForChainKeyQueryParam(
  chainKeyQueryParam: ChainKeyQueryParam
): Chain {
  switch (chainKeyQueryParam) {
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

    case 'local':
      return customChains.localL1Network

    case 'arbitrum-local':
      return customChains.localL2Network

    default:
      throw new Error(
        `[getChainForChainKeyQueryParam] Unexpected chainKeyQueryParam: ${chainKeyQueryParam}`
      )
  }
}
