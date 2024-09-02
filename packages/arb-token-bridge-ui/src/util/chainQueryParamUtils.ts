import { Chain } from 'wagmi'
import * as chains from 'wagmi/chains'

import {
  arbitrumNova,
  arbitrumSepolia,
  localL1Network,
  localL2Network,
  localL3Network
} from '../util/wagmi/wagmiAdditionalNetworks'
import { ChainKeyQueryParam } from '../types/ChainQueryParam'
import { getOrbitChains } from './orbitChainsList'
import { chainToWagmiChain } from '../util/wagmi/wagmiAdditionalNetworks'

export function getChainForChainKeyQueryParam(
  chainKeyQueryParam: ChainKeyQueryParam
) {
  switch (chainKeyQueryParam) {
    case 'ethereum':
      return chains.mainnet

    case 'sepolia':
      return chains.sepolia

    case 'arbitrum-one':
      return chains.arbitrum

    // case 'arbitrum-nova':
    //   return arbitrumNova

    // case 'arbitrum-sepolia':
    //   return arbitrumSepolia

    // case 'custom-localhost':
    //   return localL1Network

    // case 'arbitrum-localhost':
    //   return localL2Network

    // case 'l3-localhost':
    //   return localL3Network

    default:
      const orbitChain = getOrbitChains().find(
        chain =>
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
