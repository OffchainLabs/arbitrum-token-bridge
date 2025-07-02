import { ChainId } from '../../types/ChainId'

import { getInfuraRpcUrl } from './infura'
import { getAlchemyRpcUrl } from './alchemy'

type RpcProvider = 'infura' | 'alchemy'

export type ProductionChainId = Exclude<
  ChainId,
  ChainId.Local | ChainId.ArbitrumLocal | ChainId.L3Local
>

function getRpcProvider(): RpcProvider {
  const rpcProviderFromEnv = process.env.NEXT_PUBLIC_RPC_PROVIDER

  if (typeof rpcProviderFromEnv === 'undefined' || rpcProviderFromEnv === '') {
    console.warn(`[getRpcProvider] no provider specified`)
    console.warn(`[getRpcProvider] defaulting to infura`)
    return 'infura'
  }

  if (rpcProviderFromEnv !== 'infura' && rpcProviderFromEnv !== 'alchemy') {
    console.warn(`[getRpcProvider] unknown provider "${rpcProviderFromEnv}"`)
    console.warn(`[getRpcProvider] defaulting to infura`)
    return 'infura'
  }

  return rpcProviderFromEnv
}

export function getFallbackRpcUrl(
  chainId: number,
  rpcProviderKey?: string
): string {
  const fallbackRpcProvider =
    getRpcProvider() === 'infura' ? 'alchemy' : 'infura'

  return getRpcUrl(chainId, fallbackRpcProvider, rpcProviderKey)
}

export function getRpcUrl(
  chainId: ProductionChainId,
  rpcProvider: RpcProvider = getRpcProvider(),
  rpcProviderKey?: string
): string {
  switch (rpcProvider) {
    case 'infura': {
      // only arbitrum nova is currently not supported on infura
      if (chainId === ChainId.ArbitrumNova) {
        return 'https://nova.arbitrum.io/rpc'
      }

      return getInfuraRpcUrl(chainId, rpcProviderKey)
    }

    case 'alchemy':
      return getAlchemyRpcUrl(chainId, rpcProviderKey)
  }
}
