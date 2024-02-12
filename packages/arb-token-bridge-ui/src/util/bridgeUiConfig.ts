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
          name: 'Ethereum',
          description: 'The OG chain that started it all.'
        }
      }
    case ChainId.Goerli:
      return {
        ...ethereumBaseConfig,
        network: {
          ...ethereumBaseConfig.network,
          name: 'Goerli',
          description: 'A deprecated Ethereum testnet, use Sepolia instead.'
        }
      }
    case ChainId.Sepolia:
      return {
        ...ethereumBaseConfig,
        network: {
          ...ethereumBaseConfig.network,
          name: 'Sepolia',
          description: 'The current recommended Ethereum testnet.'
        }
      }
    case ChainId.Local:
      return {
        ...ethereumBaseConfig,
        network: {
          ...ethereumBaseConfig.network,
          name: 'Ethereum Local'
        }
      }
    case ChainId.ArbitrumOne:
      return {
        ...arbitrumBaseConfig,
        network: {
          ...arbitrumBaseConfig.network,
          name: 'Arbitrum One',
          logo: '/images/ArbitrumOneLogo.svg',
          description:
            'Rollup protocol. Permissionless validation, secured by operational fraud proofs.'
        }
      }
    case ChainId.ArbitrumGoerli:
      return {
        ...arbitrumBaseConfig,
        network: {
          ...arbitrumBaseConfig.network,
          name: 'Arbitrum Goerli',
          description:
            'A deprecated Arbitrum One testnet, use Arbitrum Sepolia instead.'
        }
      }
    case ChainId.ArbitrumSepolia:
      return {
        ...arbitrumBaseConfig,
        network: {
          ...arbitrumBaseConfig.network,
          name: 'Arbitrum Sepolia',
          description: 'The current recommended Arbitrum testnet.'
        }
      }
    case ChainId.ArbitrumLocal:
      return {
        ...arbitrumBaseConfig,
        network: {
          ...arbitrumBaseConfig.network,
          name: 'Arbitrum Local'
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
          logo: '/images/ArbitrumNovaLogo.svg',
          description:
            'AnyTrust protocol. High scale and low fee. Secured by a trust-minimized Data Availability Committee (DAC).'
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
          logo: '/images/StylusLogo.svg',
          description:
            'An experimental playground for Arbitrum Stylus smart contracts.'
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
