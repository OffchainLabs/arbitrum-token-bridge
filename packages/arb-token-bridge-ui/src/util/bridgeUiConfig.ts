import { constants } from 'ethers'
import { ChainId, getCustomChainFromLocalStorageById } from './networks'

type BridgeConfigUi = {
  primaryColor: `#${string}`
  secondaryColor: `#${string}`
  networkName: string
  networkLogo: string
  nativeTokenLogo: string
}

type BaseBridgeConfigUi = Omit<BridgeConfigUi, 'networkName'>

const ethereumBaseConfig: BaseBridgeConfigUi = {
  primaryColor: '#454A75',
  secondaryColor: '#1A1C33',
  networkLogo: '/images/EthereumLogo.svg',
  nativeTokenLogo: '/images/EthereumLogoRound.svg'
}

const arbitrumBaseConfig: Omit<BaseBridgeConfigUi, 'networkLogo'> = {
  primaryColor: '#1B4ADD',
  secondaryColor: '#001A6B',
  nativeTokenLogo: '/images/EthereumLogoRound.svg'
}

export function getBridgeUiConfigForChain(
  chainId: number,
  { variant }: { variant?: 'light' | 'dark' } = {}
): BridgeConfigUi {
  const customChain = getCustomChainFromLocalStorageById(chainId)

  const isCustomOrbitChainWithCustomNativeToken =
    customChain &&
    customChain.nativeToken &&
    customChain.nativeToken !== constants.AddressZero

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
        networkName: 'Ethereum'
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
        networkName: 'Arbitrum Goerli',
        networkLogo: '/images/ArbitrumLogo.svg'
      }
    case ChainId.ArbitrumSepolia:
      return {
        ...arbitrumBaseConfig,
        networkName: 'Arbitrum Sepolia',
        networkLogo: '/images/ArbitrumLogo.svg'
      }
    case ChainId.ArbitrumLocal:
      return {
        ...arbitrumBaseConfig,
        networkName: 'Arbitrum',
        networkLogo: '/images/ArbitrumLogo.svg'
      }
    case ChainId.ArbitrumNova:
      return {
        primaryColor: '#E57310',
        secondaryColor: '#743600',
        networkName: 'Arbitrum Nova',
        networkLogo: '/images/ArbitrumNovaLogo.svg',
        nativeTokenLogo: '/images/EthereumLogoRound.svg'
      }
    case ChainId.StylusTestnet:
      return {
        primaryColor: '#E3066E',
        secondaryColor: '#7E0028',
        networkName: 'Stylus Testnet',
        networkLogo: '/images/StylusLogo.svg',
        nativeTokenLogo: '/images/EthereumLogoRound.svg'
      }
    case 660279:
      return {
        primaryColor: '#F30019',
        secondaryColor: '#87000E',
        networkName: 'Xai',
        networkLogo: '/images/XaiLogo.svg',
        nativeTokenLogo: '/images/XaiLogo.svg'
      }
    case 47279324479:
      return {
        primaryColor: '#F30019',
        secondaryColor: '#87000E',
        networkName: 'Xai Testnet',
        networkLogo: '/images/XaiLogo.svg',
        nativeTokenLogo: '/images/EthereumLogoRound.svg'
      }
    default: {
      // custom Orbit chains
      return {
        primaryColor: '#12AAFF',
        secondaryColor: '#0C4260',
        networkName: customChain ? customChain.name : 'Unknown',
        networkLogo:
          variant === 'light'
            ? '/images/OrbitLogoWhite.svg'
            : '/images/OrbitLogo.svg',
        nativeTokenLogo: isCustomOrbitChainWithCustomNativeToken
          ? ''
          : '/images/EthereumLogoRound.svg'
      }
    }
  }
}
