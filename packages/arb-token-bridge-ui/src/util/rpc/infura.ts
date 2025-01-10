import { ChainId } from '../networks'
import { ProductionChainId } from './getRpcUrl'

export type InfuraSupportedChainId = Exclude<
  ProductionChainId,
  // only arbitrum nova is currently not supported on infura
  ChainId.ArbitrumNova
>

export function getInfuraKey(chainId: InfuraSupportedChainId) {
  const defaultInfuraKey = process.env.NEXT_PUBLIC_INFURA_KEY

  switch (chainId) {
    case ChainId.Ethereum:
      return process.env.NEXT_PUBLIC_INFURA_KEY_ETHEREUM || defaultInfuraKey
    case ChainId.Sepolia:
      return process.env.NEXT_PUBLIC_INFURA_KEY_SEPOLIA || defaultInfuraKey
    case ChainId.ArbitrumOne:
      return process.env.NEXT_PUBLIC_INFURA_KEY_ARBITRUM_ONE || defaultInfuraKey
    case ChainId.Base:
      return process.env.NEXT_PUBLIC_INFURA_KEY_BASE || defaultInfuraKey
    case ChainId.ArbitrumSepolia:
      return (
        process.env.NEXT_PUBLIC_INFURA_KEY_ARBITRUM_SEPOLIA || defaultInfuraKey
      )
    case ChainId.BaseSepolia:
      return process.env.NEXT_PUBLIC_INFURA_KEY_BASE_SEPOLIA || defaultInfuraKey

    default:
      return defaultInfuraKey
  }
}

export function getInfuraRpcUrl(chainId: InfuraSupportedChainId): string {
  const infuraKey = getInfuraKey(chainId)

  switch (chainId) {
    // L1 Mainnet
    case ChainId.Ethereum:
      return `https://mainnet.infura.io/v3/${infuraKey}`

    // L1 Testnet
    case ChainId.Sepolia:
      return `https://sepolia.infura.io/v3/${infuraKey}`
    case ChainId.Holesky:
      return `https://holesky.infura.io/v3/${infuraKey}`

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
