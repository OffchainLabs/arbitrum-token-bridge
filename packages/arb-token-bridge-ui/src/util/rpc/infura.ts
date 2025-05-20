import { loadEnvironmentVariableWithFallback } from '..'
import { ChainId } from '../../types/ChainId'
import { ProductionChainId } from './getRpcUrl'

export type InfuraSupportedChainId = Exclude<
  ProductionChainId,
  // only arbitrum nova is currently not supported on infura
  ChainId.ArbitrumNova
>

export function getInfuraKeyFromEnv(chainId: InfuraSupportedChainId): string {
  const defaultInfuraKey = process.env.NEXT_PUBLIC_INFURA_KEY

  switch (chainId) {
    // L1 Mainnet
    case ChainId.Ethereum:
      return loadEnvironmentVariableWithFallback({
        env: process.env.NEXT_PUBLIC_INFURA_KEY_ETHEREUM,
        fallback: defaultInfuraKey
      })

    // L1 Testnet
    case ChainId.Sepolia:
      return loadEnvironmentVariableWithFallback({
        env: process.env.NEXT_PUBLIC_INFURA_KEY_SEPOLIA,
        fallback: defaultInfuraKey
      })

    // L2 Mainnet
    case ChainId.ArbitrumOne:
      return loadEnvironmentVariableWithFallback({
        env: process.env.NEXT_PUBLIC_INFURA_KEY_ARBITRUM_ONE,
        fallback: defaultInfuraKey
      })
    case ChainId.Base:
      return loadEnvironmentVariableWithFallback({
        env: process.env.NEXT_PUBLIC_INFURA_KEY_BASE,
        fallback: defaultInfuraKey
      })

    // L2 Testnet
    case ChainId.ArbitrumSepolia:
      return loadEnvironmentVariableWithFallback({
        env: process.env.NEXT_PUBLIC_INFURA_KEY_ARBITRUM_SEPOLIA,
        fallback: defaultInfuraKey
      })
    case ChainId.BaseSepolia:
      return loadEnvironmentVariableWithFallback({
        env: process.env.NEXT_PUBLIC_INFURA_KEY_BASE_SEPOLIA,
        fallback: defaultInfuraKey
      })
  }
}

export function getInfuraRpcUrl(
  chainId: InfuraSupportedChainId,
  infuraKey: string = getInfuraKeyFromEnv(chainId)
): string {
  switch (chainId) {
    // L1 Mainnet
    case ChainId.Ethereum:
      return `https://mainnet.infura.io/v3/${infuraKey}`

    // L1 Testnet
    case ChainId.Sepolia:
      return `https://sepolia.infura.io/v3/${infuraKey}`

    // L2 Mainnet
    case ChainId.ArbitrumOne:
      return `https://arbitrum-mainnet.infura.io/v3/${infuraKey}`
    case ChainId.Base:
      return `https://base-mainnet.infura.io/v3/${infuraKey}`

    // L2 Testnet
    case ChainId.ArbitrumSepolia:
      return `https://arbitrum-sepolia.infura.io/v3/${infuraKey}`
    case ChainId.BaseSepolia:
      return `https://base-sepolia.infura.io/v3/${infuraKey}`
  }
}
