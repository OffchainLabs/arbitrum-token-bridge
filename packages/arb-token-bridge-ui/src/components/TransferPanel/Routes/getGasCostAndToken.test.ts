import { describe, expect, test } from 'vitest'
import { constants } from 'ethers'
import { getGasCostAndToken } from './getGasCostAndToken'
import { NativeCurrency } from '../../../hooks/useNativeCurrency'
import { GasEstimationStatus } from '../../../hooks/TransferPanel/useGasSummary'
import {
  ERC20BridgeToken,
  TokenType
} from '../../../hooks/arbTokenBridge.types'

describe('getGasCostAndToken', () => {
  const mockNativeCurrency: NativeCurrency & { address: string } = {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
    isCustom: false,
    address: constants.AddressZero
  }

  const mockCustomNativeCurrency: NativeCurrency = {
    name: 'XAI',
    symbol: 'XAI',
    decimals: 18,
    isCustom: true,
    address: '0x0000000000000000000000000000000000000222'
  }

  const mockErc20: ERC20BridgeToken = {
    name: 'ERC20',
    symbol: 'ERC20',
    decimals: 18,
    type: TokenType.ERC20,
    address: '0x1111111111111111111111111111111111111111',
    listIds: new Set<string>()
  }

  describe('should return isLoading true', () => {
    const expected = {
      isLoading: true,
      gasCost: null
    }
    test.each([
      {
        status: 'loading',
        estimatedParentChainGasFees: undefined,
        estimatedChildChainGasFees: undefined,
        expected
      },
      {
        status: 'success',
        estimatedParentChainGasFees: 123,
        estimatedChildChainGasFees: undefined,
        expected
      },
      {
        status: 'success',
        estimatedParentChainGasFees: undefined,
        estimatedChildChainGasFees: 123,
        expected
      }
    ])(
      `getGasCostAndToken({
        ...,
        gasSummaryStatus: "$status",
        estimatedParentChainGasFees: $estimatedParentChainGasFees,
        estimatedChildChainGasFees: $estimatedChildChainGasFees
      })`,
      ({
        status,
        estimatedParentChainGasFees,
        estimatedChildChainGasFees,
        expected
      }) => {
        expect(
          getGasCostAndToken({
            childChainNativeCurrency: mockNativeCurrency,
            parentChainNativeCurrency: mockNativeCurrency,
            gasSummaryStatus: status as GasEstimationStatus,
            estimatedChildChainGasFees,
            estimatedParentChainGasFees,
            isDepositMode: true,
            selectedToken: null
          })
        ).toEqual(expected)
      }
    )

    // test.each([
    //   {
    //     status: 'loading',
    //     estimatedParentChainGasFees: undefined,
    //     estimatedChildChainGasFees: undefined,
    //     expected
    //   },
    //   {
    //     status: 'success',
    //     estimatedParentChainGasFees: 123,
    //     estimatedChildChainGasFees: undefined,
    //     expected
    //   },
    //   {
    //     status: 'success',
    //     estimatedParentChainGasFees: undefined,
    //     estimatedChildChainGasFees: 123,
    //     expected
    //   }
    // ])(
    //   '.add($status, $b)',
    //   ({
    //     status,
    //     estimatedChildChainGasFees,
    //     estimatedParentChainGasFees,
    //     expected
    //   }) => {
    //     expect(status + b).toBe(expected)
    //   }
    // )
  })

  describe('should return combined gas fee for same native currency', () => {
    test.each([
      {
        parentCurrency: mockNativeCurrency,
        childCurrency: mockNativeCurrency,
        estimatedParentChainGasFees: 201,
        estimatedChildChainGasFees: 305,
        isDepositMode: true
      },
      {
        parentCurrency: mockNativeCurrency,
        childCurrency: mockNativeCurrency,
        estimatedParentChainGasFees: 352,
        estimatedChildChainGasFees: 123,
        isDepositMode: false
      },
      {
        parentCurrency: mockCustomNativeCurrency,
        childCurrency: mockCustomNativeCurrency,
        estimatedParentChainGasFees: 634,
        estimatedChildChainGasFees: 234,
        isDepositMode: true
      },
      {
        parentCurrency: mockCustomNativeCurrency,
        childCurrency: mockCustomNativeCurrency,
        estimatedParentChainGasFees: 3890,
        estimatedChildChainGasFees: 32409,
        isDepositMode: false
      }
    ])(
      `getGasCostAndToken({
        ...,
        currency: $parentCurrency.name,
        isDepositMode: $isDepositMode
      })`,
      ({
        parentCurrency,
        childCurrency,
        estimatedParentChainGasFees,
        estimatedChildChainGasFees,
        isDepositMode
      }) => {
        expect(
          getGasCostAndToken({
            childChainNativeCurrency: childCurrency,
            parentChainNativeCurrency: parentCurrency,
            gasSummaryStatus: 'success',
            estimatedChildChainGasFees,
            estimatedParentChainGasFees,
            isDepositMode,
            selectedToken: null
          })
        ).toEqual({
          isLoading: false,
          gasCost: [
            {
              gasCost: estimatedParentChainGasFees + estimatedChildChainGasFees,
              gasToken: childCurrency
            }
          ]
        })
      }
    )
  })

  describe('should return gas cost for different native currencies in deposit mode', () => {
    test.each([
      {
        parentCurrency: mockNativeCurrency,
        childCurrency: mockCustomNativeCurrency,
        estimatedParentChainGasFees: 201,
        estimatedChildChainGasFees: 305,
        selectedToken: null,
        expected: {
          isLoading: false,
          gasCost: [
            {
              gasCost: 201,
              gasToken: mockNativeCurrency
            }
          ]
        }
      },
      {
        parentCurrency: mockNativeCurrency,
        childCurrency: mockCustomNativeCurrency,
        estimatedParentChainGasFees: 201,
        estimatedChildChainGasFees: 305,
        selectedToken: mockErc20,
        expected: {
          isLoading: false,
          gasCost: [
            {
              gasCost: 201,
              gasToken: mockNativeCurrency
            },
            {
              gasCost: 305,
              gasToken: mockCustomNativeCurrency
            }
          ]
        }
      },
      {
        parentCurrency: mockCustomNativeCurrency,
        childCurrency: mockNativeCurrency,
        estimatedParentChainGasFees: 634,
        estimatedChildChainGasFees: 234,
        selectedToken: null,
        expected: {
          isLoading: false,
          gasCost: [
            {
              gasCost: 634,
              gasToken: mockCustomNativeCurrency
            }
          ]
        }
      },
      {
        parentCurrency: mockCustomNativeCurrency,
        childCurrency: mockNativeCurrency,
        estimatedParentChainGasFees: 634,
        estimatedChildChainGasFees: 234,
        selectedToken: mockErc20,
        expected: {
          isLoading: false,
          gasCost: [
            {
              gasCost: 634,
              gasToken: mockCustomNativeCurrency
            },
            {
              gasCost: 234,
              gasToken: mockNativeCurrency
            }
          ]
        }
      }
    ])(
      `getGasCostAndToken({
        ...,
        parentCurrency: $parentCurrency.name,
        childCurrency: $childCurrency.name,
        selectedToken: $selectedToken
      })`,
      ({
        parentCurrency,
        childCurrency,
        estimatedParentChainGasFees,
        estimatedChildChainGasFees,
        selectedToken,
        expected
      }) => {
        expect(
          getGasCostAndToken({
            childChainNativeCurrency: childCurrency,
            parentChainNativeCurrency: parentCurrency,
            gasSummaryStatus: 'success',
            estimatedChildChainGasFees,
            estimatedParentChainGasFees,
            isDepositMode: true,
            selectedToken
          })
        ).toEqual(expected)
      }
    )
  })

  describe('should return gas cost for different native currencies in withdrawal mode', () => {
    test.each([
      {
        parentCurrency: mockNativeCurrency,
        childCurrency: mockCustomNativeCurrency,
        estimatedParentChainGasFees: 201,
        estimatedChildChainGasFees: 305,
        expected: {
          isLoading: false,
          gasCost: [
            {
              gasCost: 305,
              gasToken: mockCustomNativeCurrency
            }
          ]
        }
      },
      {
        parentCurrency: mockCustomNativeCurrency,
        childCurrency: mockNativeCurrency,
        estimatedParentChainGasFees: 634,
        estimatedChildChainGasFees: 234,
        expected: {
          isLoading: false,
          gasCost: [
            {
              gasCost: 234,
              gasToken: mockNativeCurrency
            }
          ]
        }
      }
    ])(
      `getGasCostAndToken({
        ...,
        parentCurrency: $parentCurrency.name,
        childCurrency: $childCurrency.name,
      })`,
      ({
        parentCurrency,
        childCurrency,
        estimatedParentChainGasFees,
        estimatedChildChainGasFees,
        expected
      }) => {
        expect(
          getGasCostAndToken({
            childChainNativeCurrency: childCurrency,
            parentChainNativeCurrency: parentCurrency,
            gasSummaryStatus: 'success',
            estimatedChildChainGasFees,
            estimatedParentChainGasFees,
            isDepositMode: false,
            selectedToken: null
          })
        ).toEqual(expected)
      }
    )
  })
})
