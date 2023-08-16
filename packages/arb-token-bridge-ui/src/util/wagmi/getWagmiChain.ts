import { Chain } from 'wagmi'
import {
  mainnet,
  goerli,
  sepolia,
  arbitrum,
  arbitrumGoerli
} from 'wagmi/chains'

import {
  arbitrumNova,
  arbitrumSepolia,
  localL1Network,
  localL2Network
} from './wagmiAdditionalNetworks'
import { ChainId } from '../networks'

export function getWagmiChain(chainId: number): Chain {
  switch (chainId) {
    case ChainId.Mainnet:
      return mainnet

    case ChainId.ArbitrumOne:
      return arbitrum

    case ChainId.ArbitrumNova:
      return arbitrumNova

    // Testnets
    case ChainId.Goerli:
      return goerli

    case ChainId.ArbitrumGoerli:
      return arbitrumGoerli

    case ChainId.Sepolia:
      return sepolia

    case ChainId.ArbitrumSepolia:
      return arbitrumSepolia

    // Local networks
    case ChainId.Local:
      return localL1Network

    case ChainId.ArbitrumLocal:
      return localL2Network

    default:
      throw new Error(`[getWagmiChain] Unexpected chain id: ${chainId}`)
  }
}
