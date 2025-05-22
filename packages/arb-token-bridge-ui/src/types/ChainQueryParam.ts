import { Chain } from 'wagmi/chains'
import * as chains from 'wagmi/chains'
import {
  getCustomChainFromLocalStorageById,
  getSupportedChainIds
} from '../util/networks'
import { ChainId } from '../types/ChainId'
import * as customChains from '../util/wagmi/wagmiAdditionalNetworks'
import { getOrbitChains, orbitChains } from '../util/orbitChainsList'
import { chainToWagmiChain } from '../util/wagmi/wagmiAdditionalNetworks'

const chainQueryParams = [
  'ethereum',
  'sepolia',
  'arbitrum-one',
  'arbitrum-nova',
  'base',
  'arbitrum-sepolia',
  'base-sepolia',
  'nitro-testnode-l1',
  'nitro-testnode-l2',
  'nitro-testnode-l3'
] as const

export type ChainKeyQueryParam = (typeof chainQueryParams)[number]
export type ChainQueryParam = ChainKeyQueryParam | ChainId | number | string

export function isValidChainQueryParam(value: string | number): boolean {
  if (typeof value === 'string') {
    const isValidCoreChainSlug = (
      chainQueryParams as readonly string[]
    ).includes(value)
    const isValidOrbitChainSlug = getOrbitChains().some(
      chain => chain.slug === value
    )
    return isValidCoreChainSlug || isValidOrbitChainSlug
  }

  const supportedNetworkIds = getSupportedChainIds({ includeTestnets: true })
  return supportedNetworkIds.includes(value)
}

export function getChainQueryParamForChain(chainId: ChainId): ChainQueryParam {
  switch (chainId) {
    case ChainId.Ethereum:
      return 'ethereum'

    case ChainId.ArbitrumOne:
      return 'arbitrum-one'

    case ChainId.ArbitrumNova:
      return 'arbitrum-nova'

    case ChainId.Base:
      return 'base'

    case ChainId.Sepolia:
      return 'sepolia'

    case ChainId.ArbitrumSepolia:
      return 'arbitrum-sepolia'

    case ChainId.BaseSepolia:
      return 'base-sepolia'

    case ChainId.Local:
      return 'nitro-testnode-l1'

    case ChainId.ArbitrumLocal:
      return 'nitro-testnode-l2'

    case ChainId.L3Local:
      return 'nitro-testnode-l3'

    default:
      const customChain = getCustomChainFromLocalStorageById(chainId)

      const orbitChain = orbitChains[chainId]

      if (customChain) {
        return customChain.chainId
      }

      if (orbitChain) {
        return orbitChain.slug ?? orbitChain.chainId
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

    case 'sepolia':
      return chains.sepolia

    case 'arbitrum-one':
      return chains.arbitrum

    case 'arbitrum-nova':
      return customChains.arbitrumNova

    case 'base':
      return customChains.base

    case 'arbitrum-sepolia':
      return customChains.arbitrumSepolia

    case 'base-sepolia':
      return customChains.baseSepolia

    case 'nitro-testnode-l1':
      return customChains.localL1Network

    case 'nitro-testnode-l2':
      return customChains.localL2Network

    case 'nitro-testnode-l3':
      return customChains.localL3Network

    default:
      const orbitChain = getOrbitChains().find(
        chain =>
          // @ts-ignore - chainKeyQueryParam will be altered when Orbit chains are added
          chain.slug === chainKeyQueryParam ??
          chain.chainId === Number(chainKeyQueryParam)
      )

      if (orbitChain) {
        return chainToWagmiChain(orbitChain)
      }

      throw new Error(
        `[getChainForChainKeyQueryParam] Unexpected chainKeyQueryParam: ${chainKeyQueryParam}`
      )
  }
}
