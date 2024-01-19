import { ChainId, getCustomChainFromLocalStorageById } from './networks'
import { orbitChains, BridgeUiConfig } from './orbitChainsList'

export function getBridgeUiConfigForChain(
  chainId: number,
  { variant }: { variant?: 'light' | 'dark' } = {}
): BridgeUiConfig {
  type BaseBridgeUiConfig = Omit<BridgeUiConfig, 'network'> & {
    network: Omit<BridgeUiConfig['network'], 'name'>
  }

  const ethereumBaseConfig: BaseBridgeUiConfig = {
    color: {
      primary: '#454A75',
      secondary: '#1A1C33'
    },
    network: {
      logo: '/images/EthereumLogo.svg'
    }
  }

  const arbitrumBaseConfig: BaseBridgeUiConfig = {
    color: {
      primary: '#1B4ADD',
      secondary: '#001A6B'
    },
    network: {
      logo: '/images/ArbitrumLogo.svg'
    }
  }

  const customChain = getCustomChainFromLocalStorageById(chainId)

  switch (chainId) {
    case ChainId.Ethereum:
      return {
        ...ethereumBaseConfig,
        network: {
          ...ethereumBaseConfig.network,
          name: 'Ethereum'
        }
      }
    case ChainId.Goerli:
      return {
        ...ethereumBaseConfig,
        network: {
          ...ethereumBaseConfig.network,
          name: 'Goerli'
        }
      }
    case ChainId.Sepolia:
      return {
        ...ethereumBaseConfig,
        network: {
          ...ethereumBaseConfig.network,
          name: 'Sepolia'
        }
      }
    case ChainId.Local:
      return {
        ...ethereumBaseConfig,
        network: {
          ...ethereumBaseConfig.network,
          name: 'Ethereum local'
        }
      }
    case ChainId.ArbitrumOne:
      return {
        ...arbitrumBaseConfig,
        network: {
          ...arbitrumBaseConfig.network,
          name: 'Arbitrum One'
        }
      }
    case ChainId.ArbitrumGoerli:
      return {
        ...arbitrumBaseConfig,
        network: {
          ...arbitrumBaseConfig.network,
          name: 'Arbitrum Goerli'
        }
      }
    case ChainId.ArbitrumSepolia:
      return {
        ...arbitrumBaseConfig,
        network: {
          ...arbitrumBaseConfig.network,
          name: 'Arbitrum Sepolia'
        }
      }
    case ChainId.ArbitrumLocal:
      return {
        ...arbitrumBaseConfig,
        network: {
          ...arbitrumBaseConfig.network,
          name: 'Arbitrum local'
        }
      }
    case ChainId.ArbitrumNova:
      return {
        color: {
          primary: '#E57310',
          secondary: '#743600'
        },
        network: {
          name: 'Arbitrum Nova',
          logo: '/images/ArbitrumNovaLogo.svg'
        }
      }
    case ChainId.StylusTestnet:
      return {
        color: {
          primary: '#E3066E',
          secondary: '#7E0028'
        },
        network: {
          name: 'Stylus Testnet',
          logo: '/images/StylusLogo.svg'
        }
      }
    default: {
      // added Orbit chains
      const orbitChain = orbitChains[chainId]

      if (orbitChain) {
        return orbitChain.bridgeUiConfig
      }

      return {
        color: {
          primary: '#12AAFF',
          secondary: '#0C4260'
        },
        network: {
          name: customChain ? customChain.name : 'Unknown',
          logo:
            variant === 'light'
              ? '/images/OrbitLogoWhite.svg'
              : '/images/OrbitLogo.svg'
        }
      }
    }
  }
}
