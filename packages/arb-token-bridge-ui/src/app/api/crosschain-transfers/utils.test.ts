import { describe, expect, it, test } from 'vitest'
import { getTokenOverride, isValidLifiTransfer } from './utils'
import { ChainId } from '../../../types/ChainId'
import { constants } from 'ethers'
import { CommonAddress } from '../../../util/CommonAddressUtils'

function generateTestCases({
  sourceChainId,
  usdcAddress
}: {
  sourceChainId: ChainId
  usdcAddress: string
}) {
  return [
    ChainId.ApeChain,
    ChainId.Superposition,
    ChainId.ArbitrumOne,
    ChainId.Ethereum
  ]
    .filter(chain => sourceChainId !== chain)
    .map(destinationChainId => [
      {
        fromToken: usdcAddress,
        sourceChainId,
        destinationChainId
      },
      {
        fromToken:
          sourceChainId === ChainId.ApeChain ||
          destinationChainId === ChainId.ApeChain
            ? constants.AddressZero
            : undefined,
        sourceChainId,
        destinationChainId
      }
    ])
    .flatMap(testCase => testCase)
}

function generateBaseWithdrawTestCases() {
  return [
    ChainId.ApeChain,
    ChainId.Superposition,
    ChainId.ArbitrumOne,
    ChainId.Ethereum
  ]
    .map(sourceChainId => {
      const usdcToken =
        sourceChainId === ChainId.ApeChain
          ? CommonAddress.Base.USDC
          : sourceChainId === ChainId.Superposition
          ? CommonAddress.Superposition.USDCe
          : sourceChainId === ChainId.Ethereum
          ? CommonAddress.Ethereum.USDC
          : CommonAddress.ArbitrumOne.USDC
      return [
        {
          fromToken: usdcToken,
          sourceChainId,
          destinationChainId: ChainId.Base,
          expected: false
        },
        {
          fromToken: undefined,
          sourceChainId,
          destinationChainId: ChainId.Base,
          expected: false
        }
      ]
    })
    .flatMap(testCase => testCase)
}

function generateBaseDepositTestCases() {
  return [ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.Superposition]
    .map(destinationChainId => [
      {
        fromToken: CommonAddress.Base.USDC,
        sourceChainId: ChainId.Base,
        destinationChainId
      },
      {
        fromToken: constants.AddressZero,
        sourceChainId: ChainId.Base,
        destinationChainId
      }
    ])
    .flatMap(testCase => testCase)
}

describe('isValidLifiTransfer', () => {
  test.each([
    ...generateTestCases({
      sourceChainId: ChainId.ArbitrumOne,
      usdcAddress: CommonAddress.ArbitrumOne.USDC
    }),
    ...generateTestCases({
      sourceChainId: ChainId.Ethereum,
      usdcAddress: CommonAddress.Ethereum.USDC
    }),
    ...generateTestCases({
      sourceChainId: ChainId.ApeChain,
      usdcAddress: CommonAddress.ApeChain.USDCe
    }),
    ...generateTestCases({
      sourceChainId: ChainId.Superposition,
      usdcAddress: CommonAddress.Superposition.USDCe
    })
  ])(
    `from $sourceChainId to $destinationChainId with token $fromToken should return true`,
    ({ destinationChainId, fromToken, sourceChainId }) => {
      expect(
        isValidLifiTransfer({ fromToken, sourceChainId, destinationChainId })
      ).toBe(true)
    }
  )

  test.each(generateBaseWithdrawTestCases())(
    `Withdraw from $sourceChainId to Base with token $fromToken should return false`,
    ({ destinationChainId, fromToken, sourceChainId }) => {
      expect(
        isValidLifiTransfer({ fromToken, sourceChainId, destinationChainId })
      ).toBe(false)
    }
  )

  test.each(generateBaseDepositTestCases())(
    `Deposit from Base to $destinationChainId with token $fromToken should return true`,
    ({ destinationChainId, fromToken, sourceChainId }) => {
      expect(
        isValidLifiTransfer({ fromToken, sourceChainId, destinationChainId })
      ).toBe(true)
    }
  )

  it('ArbitrumOne to ApeChain with Ape should return false', () => {
    expect(
      isValidLifiTransfer({
        fromToken: undefined,
        sourceChainId: ChainId.ArbitrumOne,
        destinationChainId: ChainId.ApeChain
      })
    ).toBe(false)
  })
})

describe('getTokenOverride', () => {
  const weth = {
    address: '0xf4d9235269a96aadafc9adae454a0618ebe37949',
    decimals: 18,
    logoURI:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    type: 'ERC20',
    listIds: new Set()
  }
  const eth = {
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    listIds: new Set(),
    logoURI: '/images/EthereumLogoRound.svg',
    name: 'Ether',
    symbol: 'ETH',
    type: 'ERC20'
  }

  it('For transfers including ApeChain, returns WETH on ApeChain, Ether on the other chain', () => {
    const apeToArbOverride = getTokenOverride({
      fromToken: constants.AddressZero,
      sourceChainId: ChainId.ApeChain,
      destinationChainId: ChainId.ArbitrumOne
    })
    const apeToMainnetOverride = getTokenOverride({
      fromToken: constants.AddressZero,
      sourceChainId: ChainId.ApeChain,
      destinationChainId: ChainId.Ethereum
    })

    const arbToApeOverride = getTokenOverride({
      fromToken: constants.AddressZero,
      sourceChainId: ChainId.ApeChain,
      destinationChainId: ChainId.ArbitrumOne
    })
    const mainnetToApeOverride = getTokenOverride({
      fromToken: constants.AddressZero,
      sourceChainId: ChainId.ApeChain,
      destinationChainId: ChainId.Ethereum
    })

    expect(apeToArbOverride.source).toEqual(weth)
    expect(apeToMainnetOverride.source).toEqual(weth)

    expect(apeToArbOverride.destination).toEqual(eth)
    expect(apeToMainnetOverride.destination).toEqual(eth)

    expect(arbToApeOverride.source).toEqual(weth)
    expect(mainnetToApeOverride.source).toEqual(weth)

    expect(arbToApeOverride.destination).toEqual(eth)
    expect(mainnetToApeOverride.destination).toEqual(eth)
  })

  it("Don't override native token for ApeChain", () => {
    const arbToApeOverride = getTokenOverride({
      fromToken: undefined,
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.ApeChain
    })

    // No override, default to null (Ape on ApeChain)
    expect(arbToApeOverride.source).toEqual(null)
    expect(arbToApeOverride.destination).toEqual(null)
  })

  it('For transfers including Superposition returns USDCe on Superposition', () => {
    const arbToSuperpositionOverride = getTokenOverride({
      fromToken: CommonAddress.ArbitrumOne.USDC,
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Superposition
    })
    const superpositionToMainnetOverride = getTokenOverride({
      fromToken: CommonAddress.Ethereum.USDC,
      sourceChainId: ChainId.Superposition,
      destinationChainId: ChainId.Ethereum
    })

    const nativeUsdcToken = {
      decimals: 6,
      listIds: new Set(),
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png',
      name: 'USDC',
      symbol: 'USDC',
      type: 'ERC20'
    }
    const bridgedUsdcToken = {
      decimals: 6,
      listIds: new Set(),
      logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png',
      name: 'Bridged USDC',
      symbol: 'USDC.e',
      type: 'ERC20'
    }
    expect(arbToSuperpositionOverride.source).toEqual({
      ...nativeUsdcToken,
      address: CommonAddress.ArbitrumOne.USDC
    })
    expect(arbToSuperpositionOverride.destination).toEqual({
      ...bridgedUsdcToken,
      address: CommonAddress.Superposition.USDCe
    })

    expect(superpositionToMainnetOverride.source).toEqual({
      ...bridgedUsdcToken,
      address: CommonAddress.Superposition.USDCe
    })
    expect(superpositionToMainnetOverride.destination).toEqual({
      ...nativeUsdcToken,
      address: CommonAddress.Ethereum.USDC
    })
  })
})
