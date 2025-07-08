import { loadEnvironmentVariableWithFallback } from '..'
import { ChainId } from '../../types/ChainId'
import { ProductionChainId } from './getRpcUrl'

export function getAlchemyKeyFromEnv(chainId: ProductionChainId): string {
  const defaultAlchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY

  switch (chainId) {
    // L1 Mainnet
    case ChainId.Ethereum:
      return loadEnvironmentVariableWithFallback({
        env: process.env.NEXT_PUBLIC_ALCHEMY_KEY_ETHEREUM,
        fallback: defaultAlchemyKey
      })

    // L1 Testnet
    case ChainId.Sepolia:
      return loadEnvironmentVariableWithFallback({
        env: process.env.NEXT_PUBLIC_ALCHEMY_KEY_SEPOLIA,
        fallback: defaultAlchemyKey
      })

    // L2 Mainnet
    case ChainId.ArbitrumOne:
      return loadEnvironmentVariableWithFallback({
        env: process.env.NEXT_PUBLIC_ALCHEMY_KEY_ARBITRUM_ONE,
        fallback: defaultAlchemyKey
      })
    case ChainId.ArbitrumNova:
      return loadEnvironmentVariableWithFallback({
        env: process.env.NEXT_PUBLIC_ALCHEMY_KEY_ARBITRUM_NOVA,
        fallback: defaultAlchemyKey
      })
    case ChainId.Base:
      return loadEnvironmentVariableWithFallback({
        env: process.env.NEXT_PUBLIC_ALCHEMY_KEY_BASE,
        fallback: defaultAlchemyKey
      })

    // L2 Testnet
    case ChainId.ArbitrumSepolia:
      return loadEnvironmentVariableWithFallback({
        env: process.env.NEXT_PUBLIC_ALCHEMY_KEY_ARBITRUM_SEPOLIA,
        fallback: defaultAlchemyKey
      })
    case ChainId.BaseSepolia:
      return loadEnvironmentVariableWithFallback({
        env: process.env.NEXT_PUBLIC_ALCHEMY_KEY_BASE_SEPOLIA,
        fallback: defaultAlchemyKey
      })
  }
}

export function getAlchemyRpcUrl(
  chainId: ProductionChainId,
  alchemyKey: string = getAlchemyKeyFromEnv(chainId)
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
    case ChainId.ApeChain:
      return ''
    case ChainId.Superposition:
      return ''
  }
}
