import { Chain } from 'wagmi'

import { chains } from '../../constants'
import { ChainId } from '../../util/networks'

export function getPartnerChainsForChain(chain: Chain): Chain[] {
  switch (chain.id) {
    case ChainId.Mainnet:
      return [chains.arbitrumOne, chains.arbitrumNova]

    case ChainId.Goerli:
      return [chains.arbitrumGoerli]

    case ChainId.ArbitrumOne:
      return [chains.mainnet]

    case ChainId.ArbitrumNova:
      return [chains.mainnet]

    case ChainId.ArbitrumGoerli:
      return [chains.goerli]

    default:
      throw new Error(
        `[getPartnerChainsForChain] Unexpected chain id: ${chain.id}`
      )
  }
}
