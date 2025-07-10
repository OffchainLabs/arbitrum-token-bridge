import { describe, expect, it, test } from 'vitest'
import { isValidLifiTransfer } from './utils'
import { ChainId } from '../../../types/ChainId'
import { constants } from 'ethers'
import { CommonAddress } from '../../../util/CommonAddressUtils'

function generateTestCases({
  sourceChainId,
  usdcAddress,
  ethAddress
}: {
  sourceChainId: ChainId
  usdcAddress: string
  ethAddress?: string
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
        fromToken: ethAddress || constants.AddressZero,
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
    .map(sourceChainId => [
      {
        fromToken: CommonAddress.ArbitrumOne.USDC,
        sourceChainId,
        destinationChainId: ChainId.Base,
        expected: false
      },
      {
        fromToken: constants.AddressZero,
        sourceChainId,
        destinationChainId: ChainId.Base,
        expected: false
      }
    ])
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
      usdcAddress: CommonAddress.ApeChain.USDCe,
      ethAddress: CommonAddress.ApeChain.WETH
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
