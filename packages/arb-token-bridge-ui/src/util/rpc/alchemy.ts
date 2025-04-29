import { loadEnvironmentVariableWithFallback } from '..'
import { ChainId } from '../../types/ChainId'
import { ProductionChainId } from './getRpcUrl'

export function getAlchemyRpcUrl(
  chainId: ProductionChainId,
  alchemyKey: string = loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_ALCHEMY_KEY
  })
): string {
  switch (chainId) {
    // L1 Mainnet
    case ChainId.Ethereum:
      return `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`

    // L1 Testnet
    case ChainId.Sepolia:
      return `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`

    // L2 Mainnet
    case ChainId.ArbitrumOne:
      return `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`
    case ChainId.ArbitrumNova:
      return `https://arbnova-mainnet.g.alchemy.com/v2/${alchemyKey}`
    case ChainId.Base:
      return `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`

    // L2 Testnet
    case ChainId.ArbitrumSepolia:
      return `https://arb-sepolia.g.alchemy.com/v2/${alchemyKey}`
    case ChainId.BaseSepolia:
      return `https://base-sepolia.g.alchemy.com/v2/${alchemyKey}`
  }
}
