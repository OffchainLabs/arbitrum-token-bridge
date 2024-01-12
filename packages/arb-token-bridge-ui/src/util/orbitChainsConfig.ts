import { ChainId } from './networks'

type OrbitConfigUI = {
  primaryColor: `#${string}`
  secondaryColor: `#${string}`
  networkLogo: string
  nativeTokenLogo: string
}

export function getChainConfigUI(
  chainId: ChainId,
  { variant }: { variant?: 'light' | 'dark' } = {}
): OrbitConfigUI {
  switch (chainId) {
    case ChainId.Ethereum:
    case ChainId.Goerli:
    case ChainId.Sepolia:
    case ChainId.Local:
      return {
        primaryColor: '#454A75',
        secondaryColor: '#1A1C33',
        networkLogo: '/images/EthereumLogo.svg',
        nativeTokenLogo: '/images/EthereumLogoRound.svg'
      }
    case ChainId.ArbitrumOne:
      return {
        primaryColor: '#1B4ADD',
        secondaryColor: '#001A6B',
        networkLogo: '/images/ArbitrumOneLogo.svg',
        nativeTokenLogo: '/images/EthereumLogoRound.svg'
      }
    case ChainId.ArbitrumGoerli:
    case ChainId.ArbitrumSepolia:
    case ChainId.ArbitrumLocal:
      return {
        primaryColor: '#1B4ADD',
        secondaryColor: '#001A6B',
        networkLogo: '/images/ArbitrumLogo.svg',
        nativeTokenLogo: '/images/EthereumLogoRound.svg'
      }
    case ChainId.ArbitrumNova:
      return {
        primaryColor: '#E57310',
        secondaryColor: '#743600',
        networkLogo: '/images/ArbitrumNovaLogo.svg',
        nativeTokenLogo: '/images/EthereumLogoRound.svg'
      }
    case ChainId.StylusTestnet:
      return {
        primaryColor: '#E3066E',
        secondaryColor: '#7E0028',
        networkLogo: '/images/StylusLogo.svg',
        nativeTokenLogo: '/images/EthereumLogoRound.svg'
      }
    case ChainId.Xai:
      return {
        primaryColor: '#F30019',
        secondaryColor: '#87000E',
        networkLogo: '/images/XaiLogo.svg',
        nativeTokenLogo: '/images/XaiLogo.svg'
      }
    case ChainId.XaiTestnet:
      return {
        primaryColor: '#F30019',
        secondaryColor: '#87000E',
        networkLogo: '/images/XaiLogo.svg',
        nativeTokenLogo: '/images/EthereumLogoRound.svg'
      }
    default: {
      // custom Orbit chains
      return {
        primaryColor: '#12AAFF',
        secondaryColor: '#0C4260',
        networkLogo:
          variant === 'light'
            ? '/images/OrbitLogoWhite.svg'
            : '/images/OrbitLogo.svg',
        nativeTokenLogo: ''
      }
    }
  }
}
