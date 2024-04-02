import { Chain, ChainProviderFn } from 'wagmi'
import { ChainId, rpcURLs } from './networks'
import { providers } from 'ethers'

export function infuraProvider<TChain extends Chain>(): ChainProviderFn<
  TChain,
  providers.InfuraProvider,
  providers.InfuraWebSocketProvider
> {
  return function (chain) {
    // Retrieve the API key for the current chain's network
    const infuraKey = chainIdToInfuraKey(chain.id)

    if (!infuraKey) return null
    if (!chain.rpcUrls.infura?.http[0]) return null

    // Continue with the rest of the function...
    return {
      chain: {
        ...chain,
        rpcUrls: {
          ...chain.rpcUrls,
          default: {
            http: [rpcURLs[chain.id]]
          }
        }
      } as TChain,
      provider: () => {
        const provider = new providers.InfuraProvider(
          {
            chainId: chain.id,
            name: chain.network,
            ensAddress: chain.contracts?.ensRegistry?.address
          },
          infuraKey
        )
        return Object.assign(provider)
      },
      webSocketProvider: () =>
        new providers.InfuraWebSocketProvider(
          {
            chainId: chain.id,
            name: chain.network,
            ensAddress: chain.contracts?.ensRegistry?.address
          },
          infuraKey
        )
    }
  }
}

export function chainIdToInfuraKey(chainId: ChainId) {
  const defaultInfuraKey = process.env.NEXT_PUBLIC_INFURA_KEY

  switch (chainId) {
    case ChainId.Ethereum:
      return process.env.NEXT_PUBLIC_INFURA_KEY_ETHEREUM || defaultInfuraKey
    case ChainId.Sepolia:
      return process.env.NEXT_PUBLIC_INFURA_KEY_SEPOLIA || defaultInfuraKey
    case ChainId.ArbitrumOne:
      return process.env.NEXT_PUBLIC_INFURA_KEY_ARBITRUM_ONE || defaultInfuraKey
    case ChainId.ArbitrumSepolia:
      return (
        process.env.NEXT_PUBLIC_INFURA_KEY_ARBITRUM_SEPOLIA || defaultInfuraKey
      )

    default:
      return defaultInfuraKey
  }
}

export function chainIdToInfuraUrl(chainId: ChainId) {
  let baseUrl
  const infuraKey = chainIdToInfuraKey(chainId)

  switch (chainId) {
    case ChainId.Ethereum:
      baseUrl = 'https://mainnet.infura.io/v3/'
      break
    case ChainId.Sepolia:
      baseUrl = 'https://sepolia.infura.io/v3/'
      break
    case ChainId.ArbitrumOne:
      baseUrl = 'https://arbitrum-mainnet.infura.io/v3/'
      break
    case ChainId.ArbitrumSepolia:
      baseUrl = 'https://arbitrum-sepolia.infura.io/v3/'
      break
    default:
      return undefined
  }

  if (!infuraKey) {
    // neither network-specific or default key was found
    return undefined
  }

  return baseUrl + infuraKey
}
