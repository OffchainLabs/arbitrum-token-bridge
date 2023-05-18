import { Chain } from 'wagmi'
import { mainnet, goerli, arbitrum, arbitrumGoerli } from 'wagmi/chains'

import { arbitrumNova } from './wagmiAdditionalNetworks'
import { ChainId } from '../networks'

export function getWagmiChain(chainId: number): Chain {
  switch (chainId) {
    case ChainId.Mainnet:
      return mainnet

    case ChainId.Goerli:
      return goerli

    case ChainId.ArbitrumOne:
      return arbitrum

    case ChainId.ArbitrumNova:
      return arbitrumNova

    case ChainId.ArbitrumGoerli:
      return arbitrumGoerli

    default:
      throw new Error(`[getWagmiChain] Unexpected chain id: ${chainId}`)
  }
}
