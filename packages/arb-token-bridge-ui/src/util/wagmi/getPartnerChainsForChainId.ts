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
const customArbitrumSepoliaChains = customWagmiChains
  .filter(chain => chain.partnerChainID === ChainId.ArbitrumSepolia)
  .map(chain => chainToWagmiChain(chain))

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
      throw new Error(
        `[getPartnerChainsForChain] Unexpected chain id: ${chainId}`
      )
  }
}
