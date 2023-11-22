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

const customWagmiChains = getCustomChainsFromLocalStorage()
const customArbitrumGoerliChains = customWagmiChains
  .filter(chain => chain.partnerChainID === ChainId.ArbitrumGoerli)
  .map(chain => chainToWagmiChain(chain))
const customArbitrumGoerliChainsIds = customArbitrumGoerliChains.map(
  chain => chain.id
)
const customArbitrumSepoliaChains = customWagmiChains
  .filter(chain => chain.partnerChainID === ChainId.ArbitrumSepolia)
  .map(chain => chainToWagmiChain(chain))
const customArbitrumSepoliaChainsIds = customArbitrumGoerliChains.map(
  chain => chain.id
)

export function getPartnerChainsForChainId(chainId: number): Chain[] {
  switch (chainId) {
    case ChainId.Ethereum:
      return [arbitrumOne, arbitrumNova]

    case ChainId.Goerli:
      return [arbitrumGoerli]

    case ChainId.Sepolia:
      return [arbitrumSepolia]

    case ChainId.ArbitrumOne:
      return [mainnet]

    case ChainId.ArbitrumNova:
      return [mainnet]

    case ChainId.ArbitrumGoerli:
      return [goerli, xaiTestnet, ...customArbitrumGoerliChains]

    case ChainId.ArbitrumSepolia:
      return [sepolia, stylusTestnet, ...customArbitrumSepoliaChains]

    case ChainId.StylusTestnet:
      return [arbitrumSepolia]

    case ChainId.XaiTestnet:
      return [arbitrumGoerli]

    default:
      // Orbit chains
      if (customArbitrumGoerliChainsIds.includes(chainId)) {
        return [arbitrumGoerli]
      }

      if (customArbitrumSepoliaChainsIds.includes(chainId)) {
        return [arbitrumSepolia]
      }
      throw new Error(
        `[getPartnerChainsForChain] Unexpected chain id: ${chainId}`
      )
  }
}
