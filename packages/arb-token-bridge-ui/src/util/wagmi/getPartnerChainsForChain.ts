import { Chain } from 'wagmi'
import {
  mainnet,
  goerli,
  sepolia,
  arbitrum as arbitrumOne,
  arbitrumGoerli
} from 'wagmi/chains'

import { ChainId } from '../../util/networks'
import {
  arbitrumNova,
  arbitrumSepolia,
  stylusTestnet,
  xaiTestnet
} from './wagmiAdditionalNetworks'

export function getPartnerChainsForChain(chain: Chain): Chain[] {
  switch (chain.id) {
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
      return [goerli, xaiTestnet, stylusTestnet]

    case ChainId.ArbitrumSepolia:
      return [sepolia]

    case ChainId.StylusTestnet:
      return [arbitrumGoerli]

    case ChainId.XaiTestnet:
      return [arbitrumGoerli]

    default:
      throw new Error(
        `[getPartnerChainsForChain] Unexpected chain id: ${chain.id}`
      )
  }
}
