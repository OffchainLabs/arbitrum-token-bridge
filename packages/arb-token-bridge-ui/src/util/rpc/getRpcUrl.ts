import { ChainId } from '../networks'

import { getInfuraRpcUrl } from './infura'
import { getAlchemyRpcUrl } from './alchemy'

type RpcProvider = 'infura' | 'alchemy'

function getRpcProvider(): RpcProvider {
  const rpcProviderFromEnv = process.env.NEXT_PUBLIC_RPC_PROVIDER
  return (rpcProviderFromEnv?.toLowerCase() as RpcProvider) || 'infura' // the || is intentional to handle empty strings
}

export function getRpcUrl(chainId: ChainId): string | null {
  const rpcProvider = getRpcProvider()

  switch (rpcProvider) {
    case 'infura':
      return getInfuraRpcUrl(chainId)
    case 'alchemy':
      return getAlchemyRpcUrl(chainId)
  }
}
