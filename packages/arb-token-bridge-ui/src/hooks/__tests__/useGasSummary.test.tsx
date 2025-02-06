/**
 * @jest-environment jsdom
 */
import { act, renderHook, RenderHookResult } from '@testing-library/react'
import { constants } from 'ethers'
import { getGasSummary } from '../TransferPanel/useGasSummary'

describe('getGasSummary', () => {
  it('should return loading status if balance is zero', async () => {
    const result = getGasSummary({
      selectedTokenAddress: '0x123',
      amountBigNumber: constants.Zero,
      balance: constants.Zero,
      isDepositMode: true,
      estimatedParentChainGasFees: 0,
      estimatedChildChainGasFees: 0,
      gasEstimatesError: null
    })
    expect(result).toEqual('loading')
  })
})
