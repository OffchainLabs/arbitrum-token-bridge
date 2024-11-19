import { ChainId, getCustomChainFromLocalStorageById } from './networks'
import { orbitChains, BridgeUiConfig } from './orbitChainsList'

export function getBridgeUiConfigForChain(chainId: number): BridgeUiConfig {
  type BaseBridgeUiConfig = Omit<BridgeUiConfig, 'network'> & {
    network: Omit<BridgeUiConfig['network'], 'name'>
  }

  const ethereumBaseConfig: BaseBridgeUiConfig = {
    color: '#454A75',
    network: {
      logo: '/images/EthereumLogo.svg'
    }
  }

  const arbitrumBaseConfig: BaseBridgeUiConfig = {
    color: '#1B4ADD',
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
    case ChainId.Sepolia:
      return {
        ...ethereumBaseConfig,
        network: {
          ...ethereumBaseConfig.network,
          name: 'Sepolia',
          description: 'The current recommended Ethereum testnet.'
        }
      }
    case ChainId.Holesky:
      return {
        ...ethereumBaseConfig,
        network: {
          ...ethereumBaseConfig.network,
          name: 'Holesky',
          description: 'Ethereum testnet.'
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
            'Rollup protocol. The original Arbitrum chain. Secured by functional fraud proofs.'
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
    case ChainId.L3Local:
      return {
        color: '#12AAFF',
        network: {
          name: 'L3 Local',
          logo: '/images/OrbitLogo.svg'
        }
      }
    case ChainId.ArbitrumNova:
      return {
        color: '#E57310',
        network: {
          name: 'Arbitrum Nova',
          logo: '/images/ArbitrumNovaLogo.svg',
          description:
            'AnyTrust protocol. Low fees for high-volume transactions. Secured by a trust-minimized Data Availability Committee (DAC).'
        }
      }
    case ChainId.Base:
      return {
        color: '#0052ff',
        network: {
          name: 'Base',
          logo: '/images/BaseWhite.svg',
          description:
            'Base is an Optimistic Rollup built by Coinbase with the OP Stack.'
        }
      }
    case ChainId.BaseSepolia:
      return {
        color: '#0052ff',
        network: {
          name: 'Base Sepolia',
          logo: '/images/BaseWhite.svg',
          description: 'Base Sepolia is an Ethereum L2 testnet by Coinbase.'
        }
      }
    default: {
      // added Orbit chains
      const orbitChain = orbitChains[chainId]

      if (orbitChain) {
        const bridgeUiConfig = orbitChain.bridgeUiConfig
        if (
          orbitChain.bridgeUiConfig.nativeTokenData &&
          orbitChain.bridgeUiConfig.nativeTokenData.decimals !== 18
        ) {
          // we can do this because the native token's number of decimals is always 18 on its Orbit chain
          // and this number of decimals's main use is for the wallet to add the Orbit chain
          //
          // in other cases when we need to know the number of decimals at the Parent chain,
          // we always call `useNativeCurrency` to fetch it using the parent chain provider
          // with the token address
          orbitChain.bridgeUiConfig.nativeTokenData.decimals = 18
        }
        return bridgeUiConfig
      }

      return {
        color: '#12AAFF',
        network: {
          name: customChain ? customChain.name : 'Unknown',
          logo: '/images/OrbitLogo.svg'
        }
      }
    }
  }
}
