import { renderHook } from '@testing-library/react'
import { BigNumber, constants } from 'ethers'

import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { useNetworks } from '../useNetworks'
import { ChainId } from '../../util/networks'
import { useBalances } from '../useBalances'
import { useSelectedTokenBalances } from '../TransferPanel/useSelectedTokenBalances'
import { useAppState } from '../../state'

jest.mock('../useNetworks', () => ({
  useNetworks: jest.fn()
}))

jest.mock('../useBalances', () => ({
  useBalances: jest.fn()
}))

jest.mock('../../state', () => ({
  useAppState: jest.fn().mockReturnValue({
    app: {
      selectedToken: {
        type: 'ERC20',
        decimals: 18,
        name: 'random',
        symbol: 'RAND',
        address: '0x123',
        l2Address: '0x234',
        listIds: new Set('1')
      }
    }
  })
}))

describe('useSelectedTokenBalances', () => {
  const mockedUseNetworks = jest.mocked(useNetworks)
  const mockedUseBalances = jest.mocked(useBalances)
  const mockedUseAppState = jest.mocked(useAppState)

  beforeAll(() => {
    mockedUseBalances.mockReturnValue({
      ethParentBalance: BigNumber.from(100_000),
      erc20ParentBalances: {
        '0x123': BigNumber.from(200_000),
        '0x222': BigNumber.from(250_000_000)
      },
      ethChildBalance: BigNumber.from(300_000),
      erc20ChildBalances: { '0x234': BigNumber.from(400_000) },
      updateEthChildBalance: jest.fn(),
      updateEthParentBalance: jest.fn(),
      updateErc20ParentBalances: jest.fn(),
      updateErc20ChildBalances: jest.fn()
    })
  })

  it('should return ERC20 parent balance as source balance and ERC20 child balance as destination balance when source chain is Sepolia and destination chain is Arbitrum Sepolia, and selected token address on Sepolia is 0x123', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Sepolia),
        sourceChainProvider: getProviderForChainId(ChainId.Sepolia),
        destinationChain: getWagmiChain(ChainId.ArbitrumSepolia),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia)
      },
      jest.fn()
    ])

    const { result } = renderHook(useSelectedTokenBalances)
    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(200_000),
      destinationBalance: BigNumber.from(400_000)
    })
  })

  it('should return ERC20 child balance as source balance and ERC20 parent balance as destination balance when source chain is Arbitrum Sepolia and destination chain is Sepolia, and selected token address on Sepolia is 0x123', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.ArbitrumSepolia),
        sourceChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia),
        destinationChain: getWagmiChain(ChainId.Sepolia),
        destinationChainProvider: getProviderForChainId(ChainId.Sepolia)
      },
      jest.fn()
    ])

    const { result } = renderHook(useSelectedTokenBalances)
    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(400_000),
      destinationBalance: BigNumber.from(200_000)
    })
  })

  it('should return ERC20 parent balance as source balance and zero as destination balance when source chain is Sepolia and destination chain is Arbitrum Sepolia, and selected token address on Sepolia is 0x222 but without child chain address (unbridged token)', () => {
    mockedUseAppState.mockReturnValueOnce({
      app: {
        selectedToken: {
          type: 'ERC20',
          decimals: 18,
          name: 'random',
          symbol: 'RAND',
          address: '0x222',
          listIds: new Set('2')
        }
      }
    })

    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Sepolia),
        sourceChainProvider: getProviderForChainId(ChainId.Sepolia),
        destinationChain: getWagmiChain(ChainId.ArbitrumSepolia),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia)
      },
      jest.fn()
    ])

    const { result } = renderHook(useSelectedTokenBalances)
    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(250_000_000),
      destinationBalance: constants.Zero
    })
  })

  it('should return zero as source balance and ERC20 parent balance as destination balance when source chain is Arbitrum Sepolia and destination chain is Sepolia, and selected token address on Sepolia is 0x222 but without child chain address (unbridged token)', () => {
    mockedUseAppState.mockReturnValueOnce({
      app: {
        selectedToken: {
          type: 'ERC20',
          decimals: 18,
          name: 'random',
          symbol: 'RAND',
          address: '0x222',
          listIds: new Set('2')
        }
      }
    })

    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.ArbitrumSepolia),
        sourceChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia),
        destinationChain: getWagmiChain(ChainId.Sepolia),
        destinationChainProvider: getProviderForChainId(ChainId.Sepolia)
      },
      jest.fn()
    ])

    const { result } = renderHook(useSelectedTokenBalances)
    expect(result.current).toEqual({
      sourceBalance: constants.Zero,
      destinationBalance: BigNumber.from(250_000_000)
    })
  })

  it('should return null as source balance and null as destination balance when source chain is Sepolia and destination chain is Arbitrum Sepolia, and selected token is null', () => {
    mockedUseAppState.mockReturnValueOnce({
      app: {
        selectedToken: null
      }
    })

    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Sepolia),
        sourceChainProvider: getProviderForChainId(ChainId.Sepolia),
        destinationChain: getWagmiChain(ChainId.ArbitrumSepolia),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia)
      },
      jest.fn()
    ])

    const { result } = renderHook(useSelectedTokenBalances)
    expect(result.current).toEqual({
      sourceBalance: null,
      destinationBalance: null
    })
  })

  it('should return null as source balance and null as destination balance when source chain is Arbitrum Sepolia and destination chain is Sepolia, and selected token is null', () => {
    mockedUseAppState.mockReturnValueOnce({
      app: {
        selectedToken: null
      }
    })

    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.ArbitrumSepolia),
        sourceChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia),
        destinationChain: getWagmiChain(ChainId.Sepolia),
        destinationChainProvider: getProviderForChainId(ChainId.Sepolia)
      },
      jest.fn()
    ])

    const { result } = renderHook(useSelectedTokenBalances)
    expect(result.current).toEqual({
      sourceBalance: null,
      destinationBalance: null
    })
  })
})
