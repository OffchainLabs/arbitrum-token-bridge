import { utils } from 'ethers'
import { renderHook } from '@testing-library/react'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'

import { useTransferReadiness } from '../../components/TransferPanel/useTransferReadiness'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { ChainId } from '../../types/ChainId'
import { useNetworks } from '../useNetworks'
import { useArbQueryParams } from '../useArbQueryParams'
import { useGasSummary } from '../TransferPanel/useGasSummary'
import { useAccountType } from '../useAccountType'
import { useBalances } from '../useBalances'
import { useSelectedToken } from '../useSelectedToken'
import { TokenType } from '../arbTokenBridge.types'

const AMOUNT = '0.1'
const DESTINATION_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const ERC20_MOCKED_L1_ADDRESS = '0x123'
const ERC20_MOCKED_L2_ADDRESS = '0x234'

jest.mock('../useNetworks', () => ({
  useNetworks: jest.fn()
}))

jest.mock('../useArbQueryParams', () => ({
  useArbQueryParams: jest.fn()
}))

jest.mock('../TransferPanel/useGasSummary', () => ({
  useGasSummary: jest.fn()
}))

jest.mock('../useAccountType', () => ({
  useAccountType: jest.fn()
}))

jest.mock('wagmi', () => ({
  ...jest.requireActual('wagmi'),
  useAccount: () => ({
    address: undefined,
    isConnecting: false,
    isDisconnected: false
  })
}))

jest.mock('../useBalances', () => ({
  useBalances: jest.fn()
}))

jest.mock('../useSelectedToken', () => ({
  useSelectedToken: jest.fn()
}))

const mockedBalanceEnoughEth: ReturnType<typeof useBalances> = {
  ethParentBalance: utils.parseEther('1'),
  ethChildBalance: utils.parseEther('1'),
  erc20ParentBalances: { [ERC20_MOCKED_L1_ADDRESS]: utils.parseEther('0') },
  erc20ChildBalances: { [ERC20_MOCKED_L2_ADDRESS]: utils.parseEther('0') },
  updateEthParentBalance: jest.fn(),
  updateEthChildBalance: jest.fn(),
  updateErc20ParentBalances: jest.fn(),
  updateErc20ChildBalances: jest.fn()
}

const mockedZeroBalance: ReturnType<typeof useBalances> = {
  ethParentBalance: utils.parseEther('0'),
  ethChildBalance: utils.parseEther('0'),
  erc20ParentBalances: { [ERC20_MOCKED_L1_ADDRESS]: utils.parseEther('0') },
  erc20ChildBalances: { [ERC20_MOCKED_L2_ADDRESS]: utils.parseEther('0') },
  updateEthParentBalance: jest.fn(),
  updateEthChildBalance: jest.fn(),
  updateErc20ParentBalances: jest.fn(),
  updateErc20ChildBalances: jest.fn()
}

const mockedBalanceEnoughEthOnly: ReturnType<typeof useBalances> = {
  ethParentBalance: utils.parseEther(AMOUNT),
  ethChildBalance: utils.parseEther(AMOUNT),
  erc20ParentBalances: { [ERC20_MOCKED_L1_ADDRESS]: utils.parseEther('0') },
  erc20ChildBalances: { [ERC20_MOCKED_L2_ADDRESS]: utils.parseEther('0') },
  updateEthParentBalance: jest.fn(),
  updateEthChildBalance: jest.fn(),
  updateErc20ParentBalances: jest.fn(),
  updateErc20ChildBalances: jest.fn()
}

const mockedBalanceEnoughErc20Only: ReturnType<typeof useBalances> = {
  ethParentBalance: utils.parseEther('0'),
  ethChildBalance: utils.parseEther('0'),
  erc20ParentBalances: { [ERC20_MOCKED_L1_ADDRESS]: utils.parseEther('1') },
  erc20ChildBalances: { [ERC20_MOCKED_L2_ADDRESS]: utils.parseEther('1') },
  updateEthParentBalance: jest.fn(),
  updateEthChildBalance: jest.fn(),
  updateErc20ParentBalances: jest.fn(),
  updateErc20ChildBalances: jest.fn()
}

const mockedBalanceEnoughErc20AndGas: ReturnType<typeof useBalances> = {
  ethParentBalance: utils.parseEther('0.1'),
  ethChildBalance: utils.parseEther('0.1'),
  erc20ParentBalances: { [ERC20_MOCKED_L1_ADDRESS]: utils.parseEther('1') },
  erc20ChildBalances: { [ERC20_MOCKED_L2_ADDRESS]: utils.parseEther('1') },
  updateEthParentBalance: jest.fn(),
  updateEthChildBalance: jest.fn(),
  updateErc20ParentBalances: jest.fn(),
  updateErc20ChildBalances: jest.fn()
}

const mockedErc20Token: ReturnType<typeof useSelectedToken> = [
  {
    type: TokenType.ERC20,
    decimals: 18,
    name: 'random',
    symbol: 'RAND',
    address: ERC20_MOCKED_L1_ADDRESS,
    l2Address: ERC20_MOCKED_L2_ADDRESS,
    listIds: new Set('1')
  },
  jest.fn()
]

const mockedEth: ReturnType<typeof useSelectedToken> = [null, jest.fn()]

const mockedEoa: ReturnType<typeof useAccountType> = {
  isEOA: true,
  isSmartContractWallet: false,
  isLoading: false
}

const mockedSmartContractWallet: ReturnType<typeof useAccountType> = {
  isEOA: false,
  isSmartContractWallet: true,
  isLoading: false
}

const mockedDepositMode: ReturnType<typeof useNetworks> = [
  {
    sourceChain: getWagmiChain(ChainId.Sepolia),
    sourceChainProvider: getProviderForChainId(ChainId.Sepolia),
    destinationChain: getWagmiChain(ChainId.ArbitrumSepolia),
    destinationChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia)
  },
  jest.fn()
]

const mockedWithdrawalMode: ReturnType<typeof useNetworks> = [
  {
    sourceChain: getWagmiChain(ChainId.ArbitrumSepolia),
    sourceChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia),
    destinationChain: getWagmiChain(ChainId.Sepolia),
    destinationChainProvider: getProviderForChainId(ChainId.Sepolia)
  },
  jest.fn()
]

function getQueryParam({
  amount,
  amount2 = '',
  destinationAddress = ''
}: {
  amount: string
  amount2?: string
  destinationAddress?: string
}) {
  return {
    amount,
    amount2,
    sourceChain: ChainId.Sepolia,
    destinationChain: ChainId.ArbitrumSepolia,
    destinationAddress,
    token: '',
    settingsOpen: false,
    txHistory: true
  }
}

describe('useTransferReadiness', () => {
  const mockedUseNetworks = jest.mocked(useNetworks)
  const mockedUseArbQueryParams = jest.mocked(useArbQueryParams)
  const mockedUseGasSummary = jest.mocked(useGasSummary)
  const mockedUseAccountType = jest.mocked(useAccountType)
  const mockedUseBalances = jest.mocked(useBalances)
  const mockedUseSelectedToken = jest.mocked(useSelectedToken)

  mockedUseGasSummary.mockReturnValue({
    status: 'success',
    estimatedChildChainGasFees: 0.0001,
    estimatedParentChainGasFees: 0.0001
  })

  // deposit/withdrawal
  // high gas/low gas
  // high bal/low bal
  // high amount2/low amount2
  // eth/erc20
  // eoa/scw
  describe('successful for deposit', () => {
    mockedUseNetworks.mockReturnValue(mockedDepositMode)

    it('ETH EOA', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: '0.1' }),
        jest.fn()
      ])

      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeTruthy()
      expect(result.current.errorMessages).toBeUndefined()
    })

    it('ERC20 EOA', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: '0.1' }),
        jest.fn()
      ])

      mockedUseBalances.mockReturnValue(mockedBalanceEnoughErc20AndGas)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedErc20Token)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeTruthy()
      expect(result.current.errorMessages).toBeUndefined()
    })

    it('ETH Smart Contract Wallet', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: '0.1',
          destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
        }),
        jest.fn()
      ])

      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeTruthy()
      expect(result.current.errorMessages).toBeUndefined()
    })

    it('ERC20 Smart Contract Wallet', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: '0.1',
          destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
        }),
        jest.fn()
      ])

      mockedUseBalances.mockReturnValue(mockedBalanceEnoughErc20AndGas)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedErc20Token)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeTruthy()
      expect(result.current.errorMessages).toBeUndefined()
    })
  })

  describe('successful for withdrawal', () => {
    mockedUseNetworks.mockReturnValue(mockedWithdrawalMode)
    mockedUseGasSummary.mockReturnValue({
      status: 'success',
      estimatedChildChainGasFees: 0.0001,
      estimatedParentChainGasFees: 0.0001
    })

    it('ETH EOA', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: AMOUNT }),
        jest.fn()
      ])

      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeTruthy()
      expect(result.current.errorMessages).toBeUndefined()
    })

    it('ERC20 EOA', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: AMOUNT }),
        jest.fn()
      ])

      mockedUseBalances.mockReturnValue(mockedBalanceEnoughErc20AndGas)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedErc20Token)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeTruthy()
      expect(result.current.errorMessages).toBeUndefined()
    })

    it('ETH Smart Contract Wallet', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: DESTINATION_ADDRESS
        }),
        jest.fn()
      ])

      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeTruthy()
      expect(result.current.errorMessages).toBeUndefined()
    })

    it('ERC20 Smart Contract Wallet', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: DESTINATION_ADDRESS
        }),
        jest.fn()
      ])

      mockedUseBalances.mockReturnValue(mockedBalanceEnoughErc20AndGas)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedErc20Token)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeTruthy()
      expect(result.current.errorMessages).toBeUndefined()
    })
  })

  describe('failed for deposit', () => {
    it('not enough ETH for ETH deposit EOA', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: AMOUNT }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedZeroBalance)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })
    it('not enough ETH for ETH deposit Smart Contract Wallet', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: DESTINATION_ADDRESS
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedZeroBalance)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })
    it('not enough ETH for ETH withdrawal EOA', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: AMOUNT }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedWithdrawalMode)
      mockedUseBalances.mockReturnValue(mockedZeroBalance)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })
    it('not enough ETH for ETH withdrawal Smart Contract Wallet', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: DESTINATION_ADDRESS
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedWithdrawalMode)
      mockedUseBalances.mockReturnValue(mockedZeroBalance)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })

    it('not enough ERC20 for ERC20 deposit EOA', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: AMOUNT }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedZeroBalance)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedErc20Token)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })
    it('not enough ERC20 for ERC20 deposit Smart Contract Wallet', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: DESTINATION_ADDRESS
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedZeroBalance)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedErc20Token)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })
    it('not enough ERC20 for ERC20 withdrawal EOA', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: AMOUNT }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedWithdrawalMode)
      mockedUseBalances.mockReturnValue(mockedZeroBalance)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedErc20Token)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })
    it('not enough ERC20 for ERC20 withdrawal Smart Contract Wallet', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: DESTINATION_ADDRESS
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedWithdrawalMode)
      mockedUseBalances.mockReturnValue(mockedZeroBalance)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedErc20Token)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })

    it('not enough gas for ETH deposit EOA', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: AMOUNT }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEthOnly)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })
    it('not enough gas for ETH deposit Smart Contract Wallet', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: DESTINATION_ADDRESS
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEthOnly)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })
    it('not enough gas for ETH withdrawal EOA', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: AMOUNT }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedWithdrawalMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEthOnly)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })
    it('not enough gas for ETH withdrawal Smart Contract Wallet', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: DESTINATION_ADDRESS
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedWithdrawalMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEthOnly)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      // Both parent and child gas paid by the relayer so this should pass
      expect(result.current.transferReady).toBeTruthy()
      expect(result.current.errorMessages).toBeUndefined()
    })

    // it('not enough gas for ERC20 deposit EOA')
    // it('not enough gas for ERC20 deposit Smart Contract Wallet')
    // it('not enough gas for ERC20 withdrawal EOA')
    // it('not enough gas for ERC20 withdrawal Smart Contract Wallet')

    it('destination address error for deposit EOA', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: 'invalid_address'
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages).toBeUndefined()
    })
    it('destination address error for deposit Smart Contract Wallet', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: 'invalid_address'
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages).toBeUndefined()
    })
    it('empty destination address for deposit Smart Contract Wallet', () => {
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages).toBeUndefined()
    })
    // it('destination address error for withdrawal EOA')
    // it('destination address error for withdrawal Smart Contract Wallet')
    // it('empty destination address for withdrawal Smart Contract Wallet')

    // it('amount 0 for deposit EOA')
    // it('amount 0 for deposit Smart Contract Wallet')
    // it('amount 0 for withdrawal EOA')
    // it('amount 0 for withdrawal Smart Contract Wallet')

    // Custom gas token
    // batch transfer
    // null eth, null token

    it('gas unavailable for deposit EOA', () => {
      mockedUseGasSummary.mockReturnValue({
        status: 'unavailable',
        estimatedChildChainGasFees: 0,
        estimatedParentChainGasFees: 0
      })
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: AMOUNT }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeTruthy()
      expect(result.current.errorMessages).toBeUndefined()
    })
    it('gas unavailable for deposit Smart Contract Wallet', () => {
      mockedUseGasSummary.mockReturnValue({
        status: 'unavailable',
        estimatedChildChainGasFees: 0,
        estimatedParentChainGasFees: 0
      })
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: DESTINATION_ADDRESS
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeTruthy()
      expect(result.current.errorMessages).toBeUndefined()
    })
    it('gas unavailable for withdrawal EOA', () => {
      mockedUseGasSummary.mockReturnValue({
        status: 'unavailable',
        estimatedChildChainGasFees: 0,
        estimatedParentChainGasFees: 0
      })
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: AMOUNT }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedWithdrawalMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeTruthy()
      expect(result.current.errorMessages).toBeUndefined()
    })
    it('gas unavailable for withdrawal Smart Contract Wallet', () => {
      mockedUseGasSummary.mockReturnValue({
        status: 'unavailable',
        estimatedChildChainGasFees: 0,
        estimatedParentChainGasFees: 0
      })
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: DESTINATION_ADDRESS
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedWithdrawalMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeTruthy()
      expect(result.current.errorMessages).toBeUndefined()
    })

    it('gas loading for deposit EOA', () => {
      mockedUseGasSummary.mockReturnValue({
        status: 'loading',
        estimatedChildChainGasFees: 0,
        estimatedParentChainGasFees: 0
      })
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: AMOUNT }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages).toBeUndefined()
    })
    it('gas loading for deposit Smart Contract Wallet', () => {
      mockedUseGasSummary.mockReturnValue({
        status: 'loading',
        estimatedChildChainGasFees: 0,
        estimatedParentChainGasFees: 0
      })
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: DESTINATION_ADDRESS
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages).toBeUndefined()
    })
    it('gas loading for withdrawal EOA', () => {
      mockedUseGasSummary.mockReturnValue({
        status: 'loading',
        estimatedChildChainGasFees: 0,
        estimatedParentChainGasFees: 0
      })
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: AMOUNT }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedWithdrawalMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages).toBeUndefined()
    })
    it('gas loading for withdrawal Smart Contract Wallet', () => {
      mockedUseGasSummary.mockReturnValue({
        status: 'loading',
        estimatedChildChainGasFees: 0,
        estimatedParentChainGasFees: 0
      })
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: DESTINATION_ADDRESS
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedWithdrawalMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages).toBeUndefined()
    })

    it('gas error for deposit EOA', () => {
      mockedUseGasSummary.mockReturnValue({
        status: 'error',
        estimatedChildChainGasFees: 0,
        estimatedParentChainGasFees: 0
      })
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: AMOUNT }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })
    it('gas error for deposit Smart Contract Wallet', () => {
      mockedUseGasSummary.mockReturnValue({
        status: 'error',
        estimatedChildChainGasFees: 0,
        estimatedParentChainGasFees: 0
      })
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: DESTINATION_ADDRESS
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedDepositMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })
    it('gas error for withdrawal EOA', () => {
      mockedUseGasSummary.mockReturnValue({
        status: 'error',
        estimatedChildChainGasFees: 0,
        estimatedParentChainGasFees: 0
      })
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({ amount: AMOUNT }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedWithdrawalMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedEoa)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })
    it('gas error for withdrawal Smart Contract Wallet', () => {
      mockedUseGasSummary.mockReturnValue({
        status: 'error',
        estimatedChildChainGasFees: 0,
        estimatedParentChainGasFees: 0
      })
      mockedUseArbQueryParams.mockReturnValue([
        getQueryParam({
          amount: AMOUNT,
          destinationAddress: DESTINATION_ADDRESS
        }),
        jest.fn()
      ])
      mockedUseNetworks.mockReturnValue(mockedWithdrawalMode)
      mockedUseBalances.mockReturnValue(mockedBalanceEnoughEth)
      mockedUseAccountType.mockReturnValue(mockedSmartContractWallet)
      mockedUseSelectedToken.mockReturnValue(mockedEth)

      const { result } = renderHook(useTransferReadiness)

      expect(result.current.transferReady).toBeFalsy()
      expect(result.current.errorMessages?.inputAmount1).toBeDefined()
      expect(result.current.errorMessages?.inputAmount2).toBeUndefined()
    })
  })
})
