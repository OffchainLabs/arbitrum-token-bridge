import { ether, ETHER_TOKEN_LOGO } from '../../../constants'
import {
  ERC20BridgeToken,
  TokenType
} from '../../../hooks/arbTokenBridge.types'
import { ChainId } from '../../../types/ChainId'
import { addressesEqual } from '../../../util/AddressUtils'
import {
  bridgedUsdcToken,
  CommonAddress,
  commonUsdcToken
} from '../../../util/CommonAddressUtils'
import { allowedLifiSourceChainIds, lifiDestinationChainIds } from './constants'
import { constants } from 'ethers'

export function isLifiTransfer({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: number
  destinationChainId: number
}) {
  return !!(
    allowedLifiSourceChainIds.includes(sourceChainId) &&
    lifiDestinationChainIds[sourceChainId]?.includes(destinationChainId)
  )
}

function isUsdcToken(tokenAddress: string | undefined) {
  return (
    addressesEqual(tokenAddress, CommonAddress.Ethereum.USDC) ||
    addressesEqual(tokenAddress, CommonAddress.ArbitrumOne.USDC) ||
    addressesEqual(tokenAddress, CommonAddress.Superposition.USDCe) ||
    addressesEqual(tokenAddress, CommonAddress.ApeChain.USDCe) ||
    addressesEqual(tokenAddress, CommonAddress.Base.USDC)
  )
}

export function isValidLifiTransfer({
  fromToken,
  sourceChainId,
  destinationChainId
}: {
  fromToken: string | undefined
  sourceChainId: number
  destinationChainId: number
}): boolean {
  // Check if it's a valid lifi pair
  if (
    !isLifiTransfer({
      sourceChainId,
      destinationChainId
    })
  ) {
    return false
  }

  /**
   * Check if it's Ether (native token)
   * ApeChain has the zero address for Ether
   */
  if (
    sourceChainId !== ChainId.ApeChain &&
    destinationChainId !== ChainId.ApeChain &&
    !fromToken
  ) {
    return true
  }

  if (
    addressesEqual(fromToken, CommonAddress.ApeChain.WETH) ||
    addressesEqual(fromToken, constants.AddressZero)
  ) {
    return true
  }

  if (
    (addressesEqual(fromToken, CommonAddress.Ethereum.USDC) &&
      sourceChainId === ChainId.Ethereum) ||
    (addressesEqual(fromToken, CommonAddress.ArbitrumOne.USDC) &&
      sourceChainId === ChainId.ArbitrumOne) ||
    (addressesEqual(fromToken, CommonAddress.Superposition.USDCe) &&
      sourceChainId === ChainId.Superposition) ||
    (addressesEqual(fromToken, CommonAddress.ApeChain.USDCe) &&
      sourceChainId === ChainId.ApeChain) ||
    (addressesEqual(fromToken, CommonAddress.Base.USDC) &&
      sourceChainId === ChainId.Base)
  ) {
    return true
  }

  return false
}

const etherWithLogo: ERC20BridgeToken = {
  ...ether,
  logoURI: ETHER_TOKEN_LOGO,
  type: TokenType.ERC20,
  address: constants.AddressZero,
  listIds: new Set<string>()
}

/**
 * Temporary solutions until token lists support overrides
 */
const Weth = {
  symbol: 'WETH',
  name: 'Wrapped Ether',
  decimals: 18,
  logoURI:
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png'
}

function getUsdc(chainId: number) {
  return (
    {
      [ChainId.Ethereum]: {
        address: CommonAddress.Ethereum.USDC,
        symbol: 'USDC',
        name: 'USDC'
      },
      [ChainId.ArbitrumOne]: {
        address: CommonAddress.ArbitrumOne.USDC,
        symbol: 'USDC',
        name: 'USDC'
      },
      [ChainId.Superposition]: {
        address: CommonAddress.Superposition.USDCe,
        symbol: 'USDC.e',
        name: 'Bridged USDC'
      },
      [ChainId.ApeChain]: {
        address: CommonAddress.ApeChain.USDCe,
        symbol: 'USDC.e',
        name: 'Bridged USDC'
      },
      [ChainId.Base]: {
        address: CommonAddress.Base.USDC,
        symbol: 'USDC',
        name: 'USD Coin'
      }
    }[chainId] || null
  )
}

/** Returns source and destination token for current token on (source,destination) */
export function getTokenOverride({
  fromToken,
  sourceChainId,
  destinationChainId
}: {
  fromToken: string | undefined
  sourceChainId: number
  destinationChainId: number
}):
  | {
      source: ERC20BridgeToken
      destination: ERC20BridgeToken
    }
  | {
      source: null
      destination: null
    } {
  // Eth on ApeChain
  if (addressesEqual(fromToken, constants.AddressZero)) {
    if (sourceChainId === ChainId.ApeChain) {
      return {
        source: {
          ...Weth,
          address: CommonAddress.ApeChain.WETH,
          type: TokenType.ERC20,
          listIds: new Set<string>()
        },
        destination: {
          ...etherWithLogo,
          address: constants.AddressZero
        }
      }
    }

    if (destinationChainId === ChainId.ApeChain) {
      return {
        source: {
          ...etherWithLogo,
          address: constants.AddressZero
        },
        destination: {
          ...Weth,
          address: CommonAddress.ApeChain.WETH,
          type: TokenType.ERC20,
          listIds: new Set<string>()
        }
      }
    }
  }

  // Native token on non-ETH chain
  if (!fromToken) {
    return {
      source: null,
      destination: null
    }
  }

  // USDC
  if (fromToken && isUsdcToken(fromToken)) {
    const destinationUsdcToken = getUsdc(destinationChainId)
    const sourceUsdcToken = getUsdc(sourceChainId)

    if (
      addressesEqual(fromToken, CommonAddress.Ethereum.USDC) &&
      sourceChainId === ChainId.ArbitrumOne &&
      destinationChainId === ChainId.Ethereum
    ) {
      return {
        source: {
          ...sourceUsdcToken,
          ...bridgedUsdcToken,
          name: 'Bridged USDC',
          type: TokenType.ERC20,
          listIds: new Set<string>()
        },
        destination: {
          ...commonUsdcToken,
          ...destinationUsdcToken,
          type: TokenType.ERC20,
          listIds: new Set<string>()
        }
      }
    }

    if (destinationUsdcToken && sourceUsdcToken) {
      return {
        source: {
          ...commonUsdcToken,
          ...sourceUsdcToken,
          type: TokenType.ERC20,
          listIds: new Set<string>()
        },
        destination: {
          ...commonUsdcToken,
          ...destinationUsdcToken,
          type: TokenType.ERC20,
          listIds: new Set<string>()
        }
      }
    }
  }

  return {
    source: null,
    destination: null
  }
}
