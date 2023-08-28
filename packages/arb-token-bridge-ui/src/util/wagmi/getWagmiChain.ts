import { Chain } from 'wagmi'
import { mainnet, goerli, arbitrum, arbitrumGoerli } from 'wagmi/chains'

import {
  chainToWagmiChain,
  sepolia,
  arbitrumNova,
  arbitrumSepolia,
  xaiTestnet,
  localL1Network,
  localL2Network
} from './wagmiAdditionalNetworks'
import { ChainId } from '../networks'
import { getCustomChainFromLocalStorageById } from '../../components/common/AddCustomChain'

export function getWagmiChain(chainId: number): Chain {
  const customChain = getCustomChainFromLocalStorageById(chainId)

  if (customChain) {
    return chainToWagmiChain(customChain)
  }

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

    case ChainId.XaiTestnet:
      return xaiTestnet

    // Local networks
    case ChainId.Local:
      return localL1Network

    case ChainId.ArbitrumLocal:
      return localL2Network

    default:
      throw new Error(`[getWagmiChain] Unexpected chain id: ${chainId}`)
  }
}
