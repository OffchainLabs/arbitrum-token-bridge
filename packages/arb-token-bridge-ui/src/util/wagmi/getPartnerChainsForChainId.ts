import { Chain } from 'wagmi'
import {
  mainnet,
  goerli,
  sepolia,
  arbitrum as arbitrumOne,
  arbitrumGoerli
} from 'wagmi/chains'

import { ChainId, getCustomChainsFromLocalStorage } from '../networks'
import {
  arbitrumNova,
  arbitrumSepolia,
  chainToWagmiChain,
  stylusTestnet,
  xaiTestnet
} from './wagmiAdditionalNetworks'

export function getPartnerChainsForChainId(chainId: number): Chain[] {
  const customWagmiChains = getCustomChainsFromLocalStorage()
  const customArbitrumGoerliChains = customWagmiChains
    .filter(chain => chain.partnerChainID === ChainId.ArbitrumGoerli)
    .map(chain => chainToWagmiChain(chain))
  const customArbitrumSepoliaChains = customWagmiChains
    .filter(chain => chain.partnerChainID === ChainId.ArbitrumSepolia)
    .map(chain => chainToWagmiChain(chain))
  const customArbitrumOneChains = customWagmiChains
    .filter(chain => chain.partnerChainID === ChainId.ArbitrumOne)
    .map(chain => chainToWagmiChain(chain))
  const customArbitrumNovaChains = customWagmiChains
    .filter(chain => chain.partnerChainID === ChainId.ArbitrumNova)
    .map(chain => chainToWagmiChain(chain))

  switch (chainId) {
    case ChainId.Ethereum:
      return [arbitrumOne, arbitrumNova]

    case ChainId.Goerli:
      return [arbitrumGoerli]

    case ChainId.Sepolia:
      return [arbitrumSepolia]

    case ChainId.ArbitrumOne:
      return [mainnet, ...customArbitrumOneChains]

    case ChainId.ArbitrumNova:
      return [mainnet, ...customArbitrumNovaChains]

    case ChainId.ArbitrumGoerli:
      return [goerli, xaiTestnet, ...customArbitrumGoerliChains]

    case ChainId.ArbitrumSepolia:
      return [sepolia, stylusTestnet, ...customArbitrumSepoliaChains]

    case ChainId.StylusTestnet:
      return [arbitrumSepolia]

    case ChainId.XaiTestnet:
      return [arbitrumGoerli]

    default:
      const customArbitrumGoerliChainsIds = customArbitrumGoerliChains.map(
        chain => chain.id
      )
      const customArbitrumSepoliaChainsIds = customArbitrumSepoliaChains.map(
        chain => chain.id
      )
      const customArbitrumNovaChainsIds = customArbitrumNovaChains.map(
        chain => chain.id
      )
      const customArbitrumOneChainsIds = customArbitrumOneChains.map(
        chain => chain.id
      )

      // Orbit chains
      if (customArbitrumGoerliChainsIds.includes(chainId)) {
        return [arbitrumGoerli]
      }
      if (customArbitrumSepoliaChainsIds.includes(chainId)) {
        return [arbitrumSepolia]
      }
      if (customArbitrumNovaChainsIds.includes(chainId)) {
        return [arbitrumNova]
      }
      if (customArbitrumOneChainsIds.includes(chainId)) {
        return [arbitrumOne]
      }

      throw new Error(
        `[getPartnerChainsForChain] Unexpected chain id: ${chainId}`
      )
  }
}
