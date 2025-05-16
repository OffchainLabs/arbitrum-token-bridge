import { BigNumber } from 'ethers'
import { vi, describe, beforeAll, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAccount, UseAccountReturnType } from 'wagmi'

import { useNetworks } from '../../../../hooks/useNetworks'
import { useBalances } from '../../../../hooks/useBalances'
import { useNativeCurrencyBalances } from '../useNativeCurrencyBalances'
import { getWagmiChain } from '../../../../util/wagmi/getWagmiChain'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { ChainId } from '../../../../types/ChainId'
import { useNativeCurrency } from '../../../../hooks/useNativeCurrency'

const useAccountDisconnectedMockReturnValue: UseAccountReturnType = {
  address: undefined,
  addresses: undefined,
  chain: undefined,
  chainId: undefined,
  connector: undefined,
  isConnected: false,
  isReconnecting: false,
  isConnecting: false,
  isDisconnected: true,
  status: 'disconnected'
}

vi.mock('../../../../hooks/useNetworks', () => ({
  useNetworks: vi.fn()
}))

vi.mock('../../../../hooks/useBalances', () => ({
  useBalances: vi.fn()
}))

vi.mock('../../../../hooks/useNativeCurrency', () => ({
  useNativeCurrency: vi.fn(() => ({
    isCustom: false,
    address: undefined
  }))
}))

vi.mock('../../../../hooks/useArbQueryParams', () => ({
  useArbQueryParams: () => [{ destinationAddress: undefined }]
}))

vi.mock('wagmi', async () => ({
  ...(await vi.importActual('wagmi')),
  useAccount: vi.fn(() => ({ isConnected: true }))
}))

describe('useNativeCurrencyBalances', () => {
  const mockedUseNetworks = vi.mocked(useNetworks)
  const mockedUseBalances = vi.mocked(useBalances)
  const mockedUseAccount = vi.mocked(useAccount)
  const mockedUseNativeCurrency = vi.mocked(useNativeCurrency)

  beforeAll(() => {
    mockedUseBalances.mockReturnValue({
      ethParentBalance: BigNumber.from(100_000),
      erc20ParentBalances: {
        '0x123': BigNumber.from(200_000),
        '0x222': BigNumber.from(250_000_000)
      },
      ethChildBalance: BigNumber.from(300_000),
      erc20ChildBalances: { '0x234': BigNumber.from(400_000) },
      updateEthChildBalance: vi.fn(),
      updateEthParentBalance: vi.fn(),
      updateErc20ParentBalances: vi.fn(),
      updateErc20ChildBalances: vi.fn()
    })
  })

  it(`should return ETH parent balance as source balance and 
                    ETH child balance as destination balance
    when wallet is connected, 
    destination address is the same as connected wallet, and 
    source chain is Sepolia and 
    destination chain is Arbitrum Sepolia`, () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Sepolia),
        sourceChainProvider: getProviderForChainId(ChainId.Sepolia),
        destinationChain: getWagmiChain(ChainId.ArbitrumSepolia),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia)
      },
      vi.fn()
    ])

    const { result } = renderHook(useNativeCurrencyBalances)
    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(100_000),
      destinationBalance: BigNumber.from(300_000)
    })
  })

  it(`should return ETH child balance as source balance and 
                    ETH parent balance as destination balance
    when wallet is connected, 
    destination address is the same as connected wallet, and 
    source chain is Arbitrum Sepolia and 
    destination chain is Sepolia`, () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.ArbitrumSepolia),
        sourceChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia),
        destinationChain: getWagmiChain(ChainId.Sepolia),
        destinationChainProvider: getProviderForChainId(ChainId.Sepolia)
      },
      vi.fn()
    ])

    const { result } = renderHook(useNativeCurrencyBalances)
    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(300_000),
      destinationBalance: BigNumber.from(100_000)
    })
  })

  it(`should return 0x123 parent balance as source balance and 
                    native currency "ETH" child balance as destination balance
    when wallet is connected, 
    destination address is the same as connected wallet, and 
    source chain is Sepolia and 
    destination chain is Arbitrum Sepolia`, () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Sepolia),
        sourceChainProvider: getProviderForChainId(ChainId.Sepolia),
        destinationChain: getWagmiChain(ChainId.ArbitrumSepolia),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia)
      },
      vi.fn()
    ])

    mockedUseNativeCurrency.mockReturnValue({
      isCustom: true,
      address: '0x123',
      name: 'Custom Token',
      symbol: 'CT',
      decimals: 18
    })

    const { result } = renderHook(useNativeCurrencyBalances)
    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(200_000),
      destinationBalance: BigNumber.from(300_000)
    })
  })

  it(`should return native currency "ETH" child balance as source balance and 
                    0x123 parent balance as destination balance
    when wallet is connected, 
    destination address is the same as connected wallet, and 
    source chain is Arbitrum Sepolia and 
    destination chain is Sepolia`, () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.ArbitrumSepolia),
        sourceChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia),
        destinationChain: getWagmiChain(ChainId.Sepolia),
        destinationChainProvider: getProviderForChainId(ChainId.Sepolia)
      },
      vi.fn()
    ])

    mockedUseNativeCurrency.mockReturnValue({
      isCustom: true,
      address: '0x123',
      name: 'Custom Token',
      symbol: 'CT',
      decimals: 18
    })

    const { result } = renderHook(useNativeCurrencyBalances)
    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(300_000),
      destinationBalance: BigNumber.from(200_000)
    })
  })

  it(`should return zero as source balance and 
                    ETH child balance as destination balance
    when wallet is connected, 
    destination address is not specified, and 
    source chain is Sepolia and 
    destination chain is Arbitrum Sepolia`, () => {
    mockedUseAccount.mockReturnValue(useAccountDisconnectedMockReturnValue)

    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Sepolia),
        sourceChainProvider: getProviderForChainId(ChainId.Sepolia),
        destinationChain: getWagmiChain(ChainId.ArbitrumSepolia),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia)
      },
      vi.fn()
    ])

    const { result } = renderHook(useNativeCurrencyBalances)
    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(0),
      destinationBalance: BigNumber.from(0)
    })
  })
})
