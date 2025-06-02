import { arbitrum, Chain, mainnet } from 'wagmi/chains'

import { ChainId } from '../../types/ChainId'
import { getCustomChainFromLocalStorageById } from '../networks'
import { orbitChains } from '../orbitChainsList'
import {
  arbitrumNova,
  arbitrumSepolia,
  base,
  baseSepolia,
  chainToWagmiChain,
  localL1Network,
  localL2Network,
  localL3Network,
  sepolia
} from './wagmiAdditionalNetworks'

export function getWagmiChain(chainId: number): Chain {
  const customChain = getCustomChainFromLocalStorageById(chainId)
  const orbitChain = orbitChains[chainId]

  if (customChain) {
    return chainToWagmiChain(customChain)
  }

  if (orbitChain) {
    return chainToWagmiChain(orbitChain)
  }

  switch (chainId) {
    case ChainId.Ethereum:
      return mainnet

    case ChainId.ArbitrumOne:
      return arbitrum

    case ChainId.ArbitrumNova:
      return arbitrumNova

    case ChainId.Base:
      return base

    // Testnets
    case ChainId.Sepolia:
      return sepolia

    case ChainId.ArbitrumSepolia:
      return arbitrumSepolia

    case ChainId.BaseSepolia:
      return baseSepolia

    // Local networks
    case ChainId.Local:
      return localL1Network

    case ChainId.ArbitrumLocal:
      return localL2Network

    case ChainId.L3Local:
      return localL3Network

    default:
      throw new Error(`[getWagmiChain] Unexpected chain id: ${chainId}`)
  }
}
