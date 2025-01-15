import { ChainId } from '../types/ChainId'

export function chainIdToInfuraKey(chainId: ChainId) {
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

export function chainIdToInfuraUrl(chainId: ChainId) {
  const infuraKey = chainIdToInfuraKey(chainId)

  switch (chainId) {
    case ChainId.Ethereum:
      return `https://mainnet.infura.io/v3/${infuraKey}`
    case ChainId.Sepolia:
      return `https://sepolia.infura.io/v3/${infuraKey}`
    case ChainId.ArbitrumOne:
      return `https://arbitrum-mainnet.infura.io/v3/${infuraKey}`
    case ChainId.Base:
      return `https://base-mainnet.infura.io/v3/${infuraKey}`
    case ChainId.ArbitrumSepolia:
      return `https://arbitrum-sepolia.infura.io/v3/${infuraKey}`
    case ChainId.BaseSepolia:
      return `https://base-sepolia.infura.io/v3/${infuraKey}`
    default:
      return undefined
  }
}
