import { Chain } from 'wagmi'
import {
  mainnet,
  goerli,
  arbitrum as arbitrumOne,
  arbitrumGoerli
} from 'wagmi/chains'

import { ChainId } from '../../util/networks'
import {
  arbitrumNova,
  stylusTestnet,
  xaiTestnet
} from './wagmiAdditionalNetworks'

export function getPartnerChainsForChain(chain: Chain): Chain[] {
  switch (chain.id) {
    case ChainId.Mainnet:
      return [arbitrumOne, arbitrumNova]

    case ChainId.Goerli:
      return [arbitrumGoerli]

    case ChainId.ArbitrumOne:
      return [mainnet]

    case ChainId.ArbitrumNova:
      return [mainnet]

    case ChainId.ArbitrumGoerli:
      return [goerli, xaiTestnet, stylusTestnet]

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
