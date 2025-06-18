import { bridgedUsdcToken } from '../../../constants'
import { addressesEqual } from '../../../util/AddressUtils'
import { CommonAddress } from '../../../util/CommonAddressUtils'
import { tokensMap } from './constants'
import { constants } from 'ethers'

export function getLifiDestinationToken({
  fromToken,
  fromChainId,
  toChainId
}: {
  fromToken: string
  fromChainId: string | number
  toChainId: string | number
}) {
  return tokensMap[fromChainId]?.[toChainId]?.[fromToken]
}

export function isValidLifiTransfer({
  fromToken = constants.AddressZero,
  fromChainId,
  toChainId
}: {
  fromToken: string | undefined
  fromChainId: number | string
  toChainId: number | string
}): boolean {
  const toToken = getLifiDestinationToken({
    fromToken,
    fromChainId,
    toChainId
  })

  if (!toToken) {
    return false
  }

  const expectedDestinationTokenAddress = getLifiDestinationToken({
    fromToken,
    fromChainId,
    toChainId
  })

  return addressesEqual(toToken, expectedDestinationTokenAddress)
}

export function getDestinationTokenOverride({
  fromToken,
  fromChainId,
  toChainId
}: {
  fromToken: string
  fromChainId: string | number
  toChainId: string | number
}) {
  const destinationToken = getLifiDestinationToken({
    fromToken,
    fromChainId,
    toChainId
  })

  // ApeChain
  if (toChainId === 33139) {
    if (addressesEqual(destinationToken, CommonAddress.ApeChain.USDCe)) {
      return bridgedUsdcToken
    }
    if (addressesEqual(destinationToken, CommonAddress.ApeChain.WETH)) {
      return {
        address: CommonAddress.ApeChain.WETH,
        symbol: 'WETH',
        decimals: 18,
        logoURI:
          'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png'
      }
    }
  }

  // Superposition
  if (toChainId === 55244) {
    if (addressesEqual(destinationToken, CommonAddress.Superposition.USDCe)) {
      return bridgedUsdcToken
    }
  }

  return undefined
}
