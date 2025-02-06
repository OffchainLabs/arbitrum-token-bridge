/**
 * @jest-environment jsdom
 */
import { act, renderHook, RenderHookResult } from '@testing-library/react'
import { BigNumber, constants } from 'ethers'
import { getGasSummary } from '../TransferPanel/useGasSummary'
import { useAmountBigNumber } from '../../components/TransferPanel/hooks/useAmountBigNumber'

jest.mock('../../components/TransferPanel/hooks/useAmountBigNumber', () => ({
  useAmountBigNumber: jest.fn()
}))

describe('getGasSummary', () => {
  const mockedGasSummaryParams = {
    selectedTokenAddress: '0x123',
    isDepositMode: true,
    estimatedParentChainGasFees: 0,
    estimatedChildChainGasFees: 0,
    gasEstimatesError: null
  }

  describe('given the following combinations of amount and balance', () => {
    it('should return success status if both amount and balance are zero', async () => {
      const result = getGasSummary({
        ...mockedGasSummaryParams,
        amountBigNumber: constants.Zero,
        balance: constants.Zero
      })
      expect(result.status).toEqual('success')
    })

    it('should return insufficientBalance status if amount is lower than balance', async () => {
      const result = getGasSummary({
        ...mockedGasSummaryParams,
        amountBigNumber: BigNumber.from(100_000),
        balance: constants.Zero
      })
      expect(result.status).toEqual('insufficientBalance')
    })

    it('should return loading status if balance is not a number', async () => {
      const result1 = getGasSummary({
        ...mockedGasSummaryParams,
        amountBigNumber: BigNumber.from(100_000),
        balance: null
      })
      expect(result1.status).toEqual('loading')

      const result2 = getGasSummary({
        ...mockedGasSummaryParams,
        amountBigNumber: constants.Zero,
        balance: null
      })
      expect(result2.status).toEqual('loading')
    })
  })
})
