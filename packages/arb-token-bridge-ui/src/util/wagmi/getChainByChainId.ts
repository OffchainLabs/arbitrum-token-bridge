import { Chain } from 'wagmi'
import { chainList } from './setup'

export function getChainByChainId(chainId: number): Chain {
  const chain = chainList.find(chain => chain.id === chainId)

  if (!chain) {
    throw new Error(`[getWagmiChain] Unexpected chain id: ${chainId}`)
  }

  return chain
}
