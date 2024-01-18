import { Chain } from 'wagmi'
import * as chains from 'wagmi/chains'

import {
  ChainId,
  getCustomChainFromLocalStorageById,
  getSupportedNetworks
} from '../util/networks'
import * as customChains from '../util/wagmi/wagmiAdditionalNetworks'
import { orbitChains } from '../util/orbitChainsList'
import { chainToWagmiChain } from '../util/wagmi/wagmiAdditionalNetworks'

const chainQueryParams = [
  'ethereum',
  'goerli',
  'sepolia',
  'arbitrum-one',
  'arbitrum-nova',
  'arbitrum-goerli',
  'arbitrum-sepolia',
  'stylus-testnet',
  'custom-localhost',
  'arbitrum-localhost'
] as const

export type ChainKeyQueryParam = (typeof chainQueryParams)[number]
export type ChainQueryParam = ChainKeyQueryParam | ChainId | number | string

export function isValidChainQueryParam(value: string | number): boolean {
  if (typeof value === 'string') {
    const isValidCoreChain = (chainQueryParams as readonly string[]).includes(
      value
    )
    const isValidAddedOrbitChain = Object.values(orbitChains).some(
      chain => chain.slug === value
    )
    return isValidCoreChain || isValidAddedOrbitChain
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

    case ChainId.Sepolia:
      return 'sepolia'

    case ChainId.ArbitrumSepolia:
      return 'arbitrum-sepolia'

    case ChainId.Local:
      return 'custom-localhost'

    case ChainId.ArbitrumLocal:
      return 'arbitrum-localhost'

    default:
      const customChain = getCustomChainFromLocalStorageById(chainId)

      const orbitChain = orbitChains[chainId]

      if (customChain) {
        return customChain.chainID
      }

      if (orbitChain) {
        return orbitChain.slug
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

    case 'custom-localhost':
      return customChains.localL1Network

    case 'arbitrum-localhost':
      return customChains.localL2Network

    default:
      const orbitChain = Object.values(orbitChains).find(
        chain => chain.slug === chainKeyQueryParam
      )

      if (orbitChain) {
        return chainToWagmiChain(orbitChain)
      }

      throw new Error(
        `[getChainForChainKeyQueryParam] Unexpected chainKeyQueryParam: ${chainKeyQueryParam}`
      )
  }
}
