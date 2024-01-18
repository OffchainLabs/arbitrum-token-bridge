import { constants } from 'ethers'

import { ETHER_TOKEN_LOGO } from '../constants'
import { ChainId, getCustomChainFromLocalStorageById } from './networks'
import { orbitChains } from './orbitChainsList'

export enum ConnectionState {
  LOADING,
  L1_CONNECTED,
  L2_CONNECTED,
  SEQUENCER_UPDATE,
  NETWORK_ERROR
}

export const sanitizeImageSrc = (url: string): string => {
  if (url.startsWith('ipfs')) {
    return `https://ipfs.io/ipfs/${url.substring(7)}`
  }

  return url
}

export function preloadImages(imageSources: string[]) {
  imageSources.forEach(imageSrc => {
    const image = new Image()
    image.src = imageSrc
  })
}

export const loadEnvironmentVariableWithFallback = ({
  env,
  fallback
}: {
  env?: string
  fallback?: string
}): string => {
  const isValidEnv = (value?: string) => {
    return typeof value === 'string' && value.trim().length !== 0
  }
  if (isValidEnv(env)) {
    return String(env)
  }
  if (isValidEnv(fallback)) {
    return String(fallback)
  }
  throw new Error(
    `
      Neither the provided value or its fallback are a valid environment variable.
      Expected one of them to be a non-empty string but received env: '${env}', fallback: '${fallback}'.
    `
  )
}

export const sanitizeQueryParams = (data: any) => {
  return JSON.parse(JSON.stringify(data))
}

export const getAPIBaseUrl = () => {
  // if dev environment, eg. tests, then prepend actual running environment
  // Resolves: next-js-error-only-absolute-urls-are-supported in test:ci
  return process.env.NODE_ENV === 'test' ? 'http://localhost:3000' : ''
}

type BridgeConfigUi = {
  primaryColor: `#${string}`
  secondaryColor: `#${string}`
  networkName: string
  networkLogo: string
  nativeTokenLogo: string
}

export function getBridgeUiConfigForChain(
  chainId: number,
  { variant }: { variant?: 'light' | 'dark' } = {}
): BridgeConfigUi {
  type BaseBridgeConfigUi = Omit<BridgeConfigUi, 'networkName'>

  const ethereumBaseConfig: BaseBridgeConfigUi = {
    primaryColor: '#454A75',
    secondaryColor: '#1A1C33',
    networkLogo: '/images/EthereumLogo.svg',
    nativeTokenLogo: ETHER_TOKEN_LOGO
  }

  const arbitrumBaseConfig: BaseBridgeConfigUi = {
    primaryColor: '#1B4ADD',
    secondaryColor: '#001A6B',
    networkLogo: '/images/ArbitrumLogo.svg',
    nativeTokenLogo: ETHER_TOKEN_LOGO
  }

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
        networkName: 'Arbitrum'
      }
    case ChainId.ArbitrumNova:
      return {
        primaryColor: '#E57310',
        secondaryColor: '#743600',
        networkName: 'Arbitrum Nova',
        networkLogo: '/images/ArbitrumNovaLogo.svg',
        nativeTokenLogo: ETHER_TOKEN_LOGO
      }
    case ChainId.StylusTestnet:
      return {
        primaryColor: '#E3066E',
        secondaryColor: '#7E0028',
        networkName: 'Stylus Testnet',
        networkLogo: '/images/StylusLogo.svg',
        nativeTokenLogo: ETHER_TOKEN_LOGO
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
            : '/images/OrbitLogo.svg',
        nativeTokenLogo: isCustomOrbitChainWithCustomNativeToken
          ? ''
          : ETHER_TOKEN_LOGO
      }
    }
  }
}
