import { env } from '../../config/env'
import { getInfuraRpcUrl, InfuraSupportedChainId } from './infura'
import { getAlchemyRpcUrl } from './alchemy'
import { ChainId } from '../../types/ChainId'

export type RpcProvider = 'infura' | 'alchemy'
export type ProductionChainId = Exclude<
  ChainId,
  ChainId.Local | ChainId.ArbitrumLocal | ChainId.L3Local
>

function getRpcProvider(): RpcProvider {
  return env.NEXT_PUBLIC_RPC_PROVIDER
}

export function getRpcUrl(chainId: ProductionChainId): string {
  // Arbitrum Nova is not supported by Infura, always use Alchemy
  if (chainId === ChainId.ArbitrumNova) {
    return getAlchemyRpcUrl(chainId)
  }

  const rpcProvider = getRpcProvider()

  switch (rpcProvider) {
    case 'infura':
      return getInfuraRpcUrl(chainId as InfuraSupportedChainId)

    case 'alchemy':
      return getAlchemyRpcUrl(chainId)

    default:
      throw new Error(`Unsupported RPC provider: ${rpcProvider}`)
  }
}
