import { bridgedUsdcToken, ether, ETHER_TOKEN_LOGO } from '../../../constants'
import {
  ERC20BridgeToken,
  TokenType
} from '../../../hooks/arbTokenBridge.types'
import { ChainId } from '../../../types/ChainId'
import { addressesEqual } from '../../../util/AddressUtils'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import {
  allowedLifiSourceChainIds,
  lifiDestinationChainIds,
  tokensMap
} from './constants'
import { constants } from 'ethers'

export function getLifiDestinationToken({
  fromToken,
  sourceChainId,
  destinationChainId
}: {
  fromToken: string
  sourceChainId: number
  destinationChainId: number
}) {
  return tokensMap[sourceChainId]?.[destinationChainId]?.[fromToken]
}

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

export function isValidLifiTransfer({
  fromToken = constants.AddressZero,
  sourceChainId,
  destinationChainId
}: {
  fromToken: string | undefined
  sourceChainId: number
  destinationChainId: number
}): boolean {
  if (
    !isLifiTransfer({
      sourceChainId,
      destinationChainId
    })
  ) {
    return false
  }

  const toToken = getLifiDestinationToken({
    fromToken,
    sourceChainId,
    destinationChainId
  })

  if (!toToken) {
    return false
  }

  const expectedDestinationTokenAddress = getLifiDestinationToken({
    fromToken,
    sourceChainId,
    destinationChainId
  })

  if (!addressesEqual(toToken, expectedDestinationTokenAddress)) {
    return false
  }

  return true
}

const etherWithLogo: ERC20BridgeToken = {
  ...ether,
  logoURI: ETHER_TOKEN_LOGO,
  type: TokenType.ERC20,
  address: constants.AddressZero,
  listIds: new Set<string>()
}

/**
 * When transferring ETH to ApeChain for example, destination token is WETH.
 * When transferring USDC to ApeChain or Superposition, destination token is USDCe.
 */
export function getDestinationTokenOverride({
  fromToken,
  sourceChainId,
  destinationChainId
}: {
  fromToken: string
  sourceChainId: number
  destinationChainId: number
}) {
  const destinationToken = getLifiDestinationToken({
    fromToken,
    sourceChainId,
    destinationChainId
  })

  if (destinationChainId === ChainId.ApeChain) {
    if (addressesEqual(destinationToken, CommonAddress.ApeChain.USDCe)) {
      return bridgedUsdcToken
    }
    if (addressesEqual(destinationToken, CommonAddress.ApeChain.WETH)) {
      return {
        address: CommonAddress.ApeChain.WETH,
        symbol: 'WETH_OVERRIDE?',
        decimals: 18,
        logoURI:
          'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png'
      }
    }
  }

  if (destinationChainId === ChainId.Superposition) {
    if (addressesEqual(destinationToken, CommonAddress.Superposition.USDCe)) {
      return bridgedUsdcToken
    }

    if (addressesEqual(destinationToken, constants.AddressZero)) {
      return etherWithLogo
    }
  }

  return undefined
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

export function getTokenOverride({
  fromToken,
  sourceChainId,
  destinationChainId
}: {
  fromToken: string | undefined
  sourceChainId: number
  destinationChainId: number
}) {
  // ApeChain to any other chain
  if (sourceChainId === ChainId.ApeChain) {
    if (addressesEqual(fromToken, constants.AddressZero)) {
      return {
        source: {
          ...Weth,
          address: CommonAddress.ApeChain.WETH
        },
        destination: {
          ...etherWithLogo,
          address: constants.AddressZero
        }
      }
    }
  }

  // Any chain to ApeChain
  if (destinationChainId === ChainId.ApeChain) {
    if (addressesEqual(fromToken, constants.AddressZero)) {
      return {
        source: {
          ...etherWithLogo,
          address: constants.AddressZero
        },
        destination: {
          ...Weth,
          address: CommonAddress.ApeChain.WETH
        }
      }
    }
  }
}
