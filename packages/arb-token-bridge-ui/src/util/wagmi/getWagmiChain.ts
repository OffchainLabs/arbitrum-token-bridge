import { Chain } from 'wagmi'
import { mainnet, goerli, arbitrum, arbitrumGoerli } from 'wagmi/chains'

import {
  chainToWagmiChain,
  sepolia,
  arbitrumNova,
  arbitrumSepolia,
  stylusTestnet,
  localL1Network,
  localL2Network
} from './wagmiAdditionalNetworks'
import { ChainId } from '../networks'
import { getCustomChainFromLocalStorageById } from '../networks'
import { orbitChains } from '../orbitChainsList'

export function getWagmiChain(chainId: number): Chain {
  const customChain = getCustomChainFromLocalStorageById(chainId)
  // excluding Stylus because its part of the SDK
  const orbitChain = orbitChains[chainId]

  let wagmiChain: Chain | undefined

  if (customChain) {
    wagmiChain = chainToWagmiChain(customChain)
  }

  if (orbitChain) {
    wagmiChain = chainToWagmiChain(orbitChain)
  }

  switch (chainId) {
    case ChainId.Ethereum:
      wagmiChain = mainnet
      break

    case ChainId.ArbitrumOne:
      wagmiChain = arbitrum
      break

    case ChainId.ArbitrumNova:
      wagmiChain = arbitrumNova
      break

    // Testnets
    case ChainId.Goerli:
      wagmiChain = goerli
      break

    case ChainId.ArbitrumGoerli:
      wagmiChain = arbitrumGoerli
      break

    case ChainId.Sepolia:
      wagmiChain = sepolia
      break

    case ChainId.ArbitrumSepolia:
      wagmiChain = arbitrumSepolia
      break

    case ChainId.StylusTestnet:
      wagmiChain = stylusTestnet
      break

    // Local networks
    case ChainId.Local:
      wagmiChain = localL1Network
      break

    case ChainId.ArbitrumLocal:
      wagmiChain = localL2Network
      break
  }

  if (!wagmiChain) {
    throw new Error(`[getWagmiChain] Unexpected chain id: ${chainId}`)
  }

  return wagmiChain
}
