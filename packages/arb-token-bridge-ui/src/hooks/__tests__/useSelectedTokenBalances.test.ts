import { renderHook } from '@testing-library/react'
import { BigNumber, constants } from 'ethers'

import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { useNetworks } from '../useNetworks'
import { useBalances } from '../useBalances'
import { useSelectedTokenBalances } from '../TransferPanel/useSelectedTokenBalances'
import { useSelectedToken } from '../useSelectedToken'
import { ChainId } from '../../types/ChainId'
import { TokenType } from '../arbTokenBridge.types'

jest.mock('../useNetworks', () => ({
  useNetworks: jest.fn()
}))

jest.mock('../useBalances', () => ({
  useBalances: jest.fn()
}))

jest.mock('../useSelectedToken', () => ({
  useSelectedToken: jest.fn().mockReturnValue([
    {
      type: TokenType.ERC20,
      decimals: 18,
      name: 'random',
      symbol: 'RAND',
      address: '0x123',
      l2Address: '0x234',
      listIds: new Set('1')
    },
    () => null
  ])
}))

describe('useSelectedTokenBalances', () => {
  const mockedUseNetworks = jest.mocked(useNetworks)
  const mockedUseBalances = jest.mocked(useBalances)
  const mockedUseSelectedToken = jest.mocked(useSelectedToken)

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
    mockedUseSelectedToken.mockReturnValueOnce([
      {
        type: TokenType.ERC20,
        decimals: 18,
        name: 'random',
        symbol: 'RAND',
        address: '0x222',
        listIds: new Set('2')
      },
      () => null
    ])

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
    mockedUseSelectedToken.mockReturnValueOnce([
      {
        type: TokenType.ERC20,
        decimals: 18,
        name: 'random',
        symbol: 'RAND',
        address: '0x222',
        listIds: new Set('2')
      },
      () => null
    ])

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
    mockedUseSelectedToken.mockReturnValueOnce([null, () => null])

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
    mockedUseSelectedToken.mockReturnValueOnce([null, () => null])

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
