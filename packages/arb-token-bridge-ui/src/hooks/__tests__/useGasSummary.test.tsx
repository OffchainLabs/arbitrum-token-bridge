import { BigNumber, constants } from 'ethers'
import { getGasSummaryStatus } from '../TransferPanel/useGasSummary'
import { ChainId } from '../../types/ChainId'
import { CommonAddress } from '../../util/CommonAddressUtils'

jest.mock('../TransferPanel/useSelectedTokenDecimals', () => ({
  useSelectedTokenDecimals: jest.fn().mockReturnValue(18)
}))

jest.mock('../../components/TransferPanel/hooks/useAmountBigNumber', () => ({
  useAmountBigNumber: jest.fn()
}))

describe('getGasSummaryStatus', () => {
  describe('given the following combinations of amount and balance', () => {
    const mockedGasSummaryParams = {
      selectedTokenAddress: '0x123',
      isDepositMode: true,
      estimatedParentChainGasFees: 0,
      estimatedChildChainGasFees: 0,
      gasEstimatesError: null,
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum
    }

    it('should return success if both amount and balance are zero', async () => {
      const result = getGasSummaryStatus({
        ...mockedGasSummaryParams,
        amountBigNumber: constants.Zero,
        balance: constants.Zero
      })
      expect(result).toEqual('success')
    })

    it('should return insufficientBalance if amount is lower than balance', async () => {
      const result = getGasSummaryStatus({
        ...mockedGasSummaryParams,
        amountBigNumber: BigNumber.from(100_000),
        balance: constants.Zero
      })
      expect(result).toEqual('insufficientBalance')
    })

    it('should return loading if balance is null', async () => {
      const result1 = getGasSummaryStatus({
        ...mockedGasSummaryParams,
        amountBigNumber: BigNumber.from(100_000),
        balance: null
      })
      expect(result1).toEqual('loading')

      const result2 = getGasSummaryStatus({
        ...mockedGasSummaryParams,
        amountBigNumber: constants.Zero,
        balance: null
      })
      expect(result2).toEqual('loading')
    })
  })

  it('should return error if there is a gas estimate error', async () => {
    const result = getGasSummaryStatus({
      selectedTokenAddress: '0x123',
      gasEstimatesError: new Error('cannot estimate gas'),
      amountBigNumber: BigNumber.from(100_000),
      balance: BigNumber.from(100_000),
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum
    })
    expect(result).toEqual('error')
  })

  it('should return unavailable if UI is withdrawal mode from Arbitrum One to Ethereum and selected token is Arbitrum One native USDC', async () => {
    const result = getGasSummaryStatus({
      selectedTokenAddress: CommonAddress.ArbitrumOne.USDC,
      gasEstimatesError: 'walletNotConnected',
      amountBigNumber: BigNumber.from(100_000),
      balance: BigNumber.from(100_000),
      sourceChainId: ChainId.ArbitrumOne,
      destinationChainId: ChainId.Ethereum
    })
    expect(result).toEqual('unavailable')
  })

  it('should return unavailable if UI is withdrawal mode from Arbitrum Sepolia to Sepolia and selected token is Arbitrum Sepolia native USDC', async () => {
    const result = getGasSummaryStatus({
      selectedTokenAddress: CommonAddress.ArbitrumSepolia.USDC,
      gasEstimatesError: 'walletNotConnected',
      amountBigNumber: BigNumber.from(100_000),
      balance: BigNumber.from(100_000),
      sourceChainId: ChainId.ArbitrumSepolia,
      destinationChainId: ChainId.Sepolia
    })
    expect(result).toEqual('unavailable')
  })
})
