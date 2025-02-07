import { act, renderHook, RenderHookResult } from '@testing-library/react'
import { BigNumber, constants } from 'ethers'
import { getGasSummary } from '../TransferPanel/useGasSummary'
import { useAmountBigNumber } from '../../components/TransferPanel/hooks/useAmountBigNumber'
import { ChainId } from '../../types/ChainId'
import { CommonAddress } from '../../util/CommonAddressUtils'

jest.mock('../../components/TransferPanel/hooks/useAmountBigNumber', () => ({
  useAmountBigNumber: jest.fn()
}))

describe('getGasSummary', () => {
  describe('given the following combinations of amount and balance', () => {
    const mockedGasSummaryParams = {
      selectedTokenAddress: '0x123',
      isDepositMode: true,
      estimatedParentChainGasFees: 0,
      estimatedChildChainGasFees: 0,
      gasEstimatesError: null,
      oftFeeSummaryLoading: false,
      oftFeeEstimatesError: false,
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum
    }

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

    it('should return loading status if balance is null', async () => {
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

  describe('given the following oft conditions', () => {
    const mockedGasSummaryParams = {
      selectedTokenAddress: '0x123',
      isDepositMode: true,
      estimatedParentChainGasFees: 0,
      estimatedChildChainGasFees: 0,
      gasEstimatesError: null,
      amountBigNumber: BigNumber.from(100_000),
      balance: BigNumber.from(100_000),
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum
    }

    it('should return error status if there is an OFT fee estimate error', async () => {
      const result = getGasSummary({
        ...mockedGasSummaryParams,
        oftFeeSummaryLoading: false,
        oftFeeEstimatesError: true
      })
      expect(result.status).toEqual('error')
    })

    it('should return success status if there is not an OFT fee estimate error', async () => {
      const result = getGasSummary({
        ...mockedGasSummaryParams,
        oftFeeSummaryLoading: false,
        oftFeeEstimatesError: false
      })
      expect(result.status).toEqual('success')
    })

    it('should return loading status if OFT fee summary is loading', async () => {
      const result = getGasSummary({
        ...mockedGasSummaryParams,
        oftFeeSummaryLoading: true,
        oftFeeEstimatesError: false
      })
      expect(result.status).toEqual('loading')
    })
  })

  it('should return error status if there is a gas estimate error', async () => {
    const result = getGasSummary({
      selectedTokenAddress: '0x123',
      estimatedParentChainGasFees: 0,
      estimatedChildChainGasFees: 0,
      gasEstimatesError: new Error('cannot estimate gas'),
      amountBigNumber: BigNumber.from(100_000),
      balance: BigNumber.from(100_000),
      oftFeeSummaryLoading: false,
      oftFeeEstimatesError: false,
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum
    })
    expect(result.status).toEqual('error')
  })

  it('should return success status if there is a wallet not connected error', async () => {
    const result = getGasSummary({
      selectedTokenAddress: '0x123',
      estimatedParentChainGasFees: 0,
      estimatedChildChainGasFees: 0,
      gasEstimatesError: 'walletNotConnected',
      amountBigNumber: BigNumber.from(100_000),
      balance: BigNumber.from(100_000),
      oftFeeSummaryLoading: false,
      oftFeeEstimatesError: false,
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum
    })
    expect(result.status).toEqual('success')
  })

  it('should return unavailable status if UI is withdrawal mode from Arbitrum One to Ethereum and selected token is Arbitrum One native USDC', async () => {
    const result = getGasSummary({
      selectedTokenAddress: CommonAddress.ArbitrumOne.USDC,
      estimatedParentChainGasFees: 0,
      estimatedChildChainGasFees: 0,
      gasEstimatesError: 'walletNotConnected',
      amountBigNumber: BigNumber.from(100_000),
      balance: BigNumber.from(100_000),
      oftFeeSummaryLoading: false,
      oftFeeEstimatesError: false,
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum
    })
    expect(result.status).toEqual('unavailable')
  })

  it('should return unavailable status if UI is withdrawal mode from Arbitrum Sepolia to Sepolia and selected token is Arbitrum Sepolia native USDC', async () => {
    const result = getGasSummary({
      selectedTokenAddress: CommonAddress.ArbitrumSepolia.USDC,
      estimatedParentChainGasFees: 0,
      estimatedChildChainGasFees: 0,
      gasEstimatesError: 'walletNotConnected',
      amountBigNumber: BigNumber.from(100_000),
      balance: BigNumber.from(100_000),
      oftFeeSummaryLoading: false,
      oftFeeEstimatesError: false,
      sourceChainId: ChainId.ArbitrumSepolia,
      destinationChainId: ChainId.Sepolia
    })
    expect(result.status).toEqual('unavailable')
  })
})
