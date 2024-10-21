import { Chain } from 'wagmi'
import { mainnet, arbitrum } from 'wagmi/chains'

import {
  chainToWagmiChain,
  sepolia,
  holesky,
  arbitrumNova,
  arbitrumSepolia,
  localL1Network,
  localL2Network,
  localL3Network,
  baseSepolia,
  base
} from './wagmiAdditionalNetworks'
import { ChainId } from '../networks'
import { getCustomChainFromLocalStorageById } from '../networks'
import { orbitChains } from '../orbitChainsList'

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

    case ChainId.Holesky:
      return holesky

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
