import { Chain } from 'wagmi'
import { mainnet, goerli, arbitrum, arbitrumGoerli } from 'wagmi/chains'

import {
  arbitrumNova,
  localL1Network,
  localL2Network,
  localL3Network
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

    // Local networks
    case ChainId.Local:
      return localL1Network

    case ChainId.ArbitrumLocal:
      return localL2Network

    // L3
    case ChainId.XaiGoerli:
      return localL3Network

    default:
      throw new Error(`[getWagmiChain] Unexpected chain id: ${chainId}`)
  }
}
