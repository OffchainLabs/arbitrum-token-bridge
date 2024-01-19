import { constants } from 'ethers'

import { ChainId, getCustomChainFromLocalStorageById } from './networks'
import { orbitChains, BridgeConfigUi } from './orbitChainsList'

export function getBridgeUiConfigForChain(
  chainId: number,
  { variant }: { variant?: 'light' | 'dark' } = {}
): BridgeConfigUi {
  type BaseBridgeConfigUi = Omit<BridgeConfigUi, 'networkName'>

  const ethereumBaseConfig: BaseBridgeConfigUi = {
    primaryColor: '#454A75',
    secondaryColor: '#1A1C33',
    networkLogo: '/images/EthereumLogo.svg'
  }

  const arbitrumBaseConfig: BaseBridgeConfigUi = {
    primaryColor: '#1B4ADD',
    secondaryColor: '#001A6B',
    networkLogo: '/images/ArbitrumLogo.svg'
  }

  const customChain = getCustomChainFromLocalStorageById(chainId)

  switch (chainId) {
    case ChainId.Ethereum:
      return {
        ...ethereumBaseConfig,
        networkName: 'Ethereum'
      }
    case ChainId.Goerli:
      return {
        ...ethereumBaseConfig,
        networkName: 'Goerli'
      }
    case ChainId.Sepolia:
      return {
        ...ethereumBaseConfig,
        networkName: 'Sepolia'
      }
    case ChainId.Local:
      return {
        ...ethereumBaseConfig,
        networkName: 'Ethereum local'
      }
    case ChainId.ArbitrumOne:
      return {
        ...arbitrumBaseConfig,
        networkName: 'Arbitrum One',
        networkLogo: '/images/ArbitrumOneLogo.svg'
      }
    case ChainId.ArbitrumGoerli:
      return {
        ...arbitrumBaseConfig,
        networkName: 'Arbitrum Goerli'
      }
    case ChainId.ArbitrumSepolia:
      return {
        ...arbitrumBaseConfig,
        networkName: 'Arbitrum Sepolia'
      }
    case ChainId.ArbitrumLocal:
      return {
        ...arbitrumBaseConfig,
        networkName: 'Arbitrum local'
      }
    case ChainId.ArbitrumNova:
      return {
        primaryColor: '#E57310',
        secondaryColor: '#743600',
        networkName: 'Arbitrum Nova',
        networkLogo: '/images/ArbitrumNovaLogo.svg'
      }
    case ChainId.StylusTestnet:
      return {
        primaryColor: '#E3066E',
        secondaryColor: '#7E0028',
        networkName: 'Stylus Testnet',
        networkLogo: '/images/StylusLogo.svg'
      }
    default: {
      // added Orbit chains
      const orbitChain = orbitChains[chainId]

      if (orbitChain) {
        return orbitChain.bridgeUiConfig
      }

      // custom Orbit chains
      return {
        primaryColor: '#12AAFF',
        secondaryColor: '#0C4260',
        networkName: customChain ? customChain.name : 'Unknown',
        networkLogo:
          variant === 'light'
            ? '/images/OrbitLogoWhite.svg'
            : '/images/OrbitLogo.svg'
      }
    }
  }
}
