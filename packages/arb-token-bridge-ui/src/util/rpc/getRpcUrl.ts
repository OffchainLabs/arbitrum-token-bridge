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
  return (rpcProviderFromEnv?.toLowerCase() as RpcProvider) || 'infura' // the || is intentional to handle empty strings
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
