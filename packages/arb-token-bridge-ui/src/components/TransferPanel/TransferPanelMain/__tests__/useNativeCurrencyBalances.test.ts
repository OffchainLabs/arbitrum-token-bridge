import { BigNumber } from 'ethers'
import { vi, describe, beforeAll, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAccount, UseAccountReturnType } from 'wagmi'

import { useNetworks } from '../../../../hooks/useNetworks'
import { useBalances } from '../../../../hooks/useBalances'
import { useNativeCurrencyBalances } from '../useNativeCurrencyBalances'
import { getWagmiChain } from '../../../../util/wagmi/getWagmiChain'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { ChainId } from '../../../../types/ChainId'
import { useNativeCurrency } from '../../../../hooks/useNativeCurrency'
import { useArbQueryParams } from '../../../../hooks/useArbQueryParams'
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'

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

const useArbQueryParamsWithDestinationAddrMockReturnValue = {
  sourceChain: ChainId.ArbitrumSepolia,
  destinationChain: ChainId.Sepolia,
  amount: '',
  amount2: '',
  destinationAddress: '0xaaa',
  token: undefined,
  settingsOpen: false,
  txHistory: true,
  tab: 0
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
  useArbQueryParams: vi.fn(() => [{ destinationAddress: undefined }])
}))

vi.mock('wagmi', async () => ({
  ...(await vi.importActual('wagmi')),
  useAccount: vi.fn(() => ({ address: '0xaaa', isConnected: true }))
}))

describe('useNativeCurrencyBalances', () => {
  const mockedUseNetworks = vi.mocked(useNetworks)
  const mockedUseBalances = vi.mocked(useBalances)
  const mockedUseAccount = vi.mocked(useAccount)
  const mockedUseArbQueryParams = vi.mocked(useArbQueryParams)
  const mockedUseNativeCurrency = vi.mocked(useNativeCurrency)

  beforeAll(() => {
    registerCustomArbitrumNetwork({
      chainId: 333333,
      parentChainId: ChainId.ArbitrumLocal,
      confirmPeriodBlocks: 20,
      ethBridge: {
        bridge: '0xA584795e24628D9c067A6480b033C9E96281fcA3',
        inbox: '0xDcA690902d3154886Ec259308258D10EA5450996',
        outbox: '0xda243bD61B011024FC923164db75Dde198AC6175',
        rollup: '0x47b238E195b638b8972Cb3649e5d6775c279245d',
        sequencerInbox: '0x16c54EE2015CD824415c2077F4103f444E00A8cb'
      },
      isCustom: true,
      isTestnet: true,
      name: 'Nitro Testnode L3',
      tokenBridge: {
        parentCustomGateway: '0xA191D519260A06b32f8D04c84b9F457B8Caa0514',
        parentErc20Gateway: '0x6B0805Fc6e275ef66a0901D0CE68805631E271e5',
        parentGatewayRouter: '0xfE03DBdf7A126994dBd749631D7fbaB58C618c58',
        parentMultiCall: '0x20a3627Dcc53756E38aE3F92717DE9B23617b422',
        parentProxyAdmin: '0x1A61102c26ad3f64bA715B444C93388491fd8E68',
        parentWeth: '0xA1abD387192e3bb4e84D3109181F9f005aBaF5CA',
        parentWethGateway: '0x77603b0ea6a797C74Fa9ef11b5BdE04A4E03D550',
        childCustomGateway: '0xD4816AeF8f85A3C1E01Cd071a81daD4fa941625f',
        childErc20Gateway: '0xaa7d51aFFEeB32d99b1CB2fd6d81D7adA4a896e8',
        childGatewayRouter: '0x8B6BC759226f8Fe687c8aD8Cc0DbF85E095e9297',
        childMultiCall: '0x052B15c8Ff0544287AE689C4F2FC53A3905d7Db3',
        childProxyAdmin: '0x36C56eC2CF3a3f53db9F01d0A5Ae84b36fb0A1e2',
        childWeth: '0x582a8dBc77f665dF2c49Ce0a138978e9267dd968',
        childWethGateway: '0xA6AB233B3c7bfd0399834897b5073974A3D467e2'
      }
    })

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

  beforeEach(() => {
    mockedUseNetworks.mockReset()
    mockedUseNativeCurrency.mockReset()
  })

  it(`should return ETH parent balance as source balance and 
                    ETH child balance as destination balance
    when wallet is connected, 
    destination address is the same as connected wallet, and 
    source chain is Sepolia and 
    destination chain is Arbitrum Sepolia`, () => {
    mockedUseNetworks.mockReturnValueOnce([
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
    mockedUseNetworks.mockReturnValueOnce([
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

  /** In the codebase we use the name `ethChildBalance` due to legacy setup
   * where only ETH was supported as native currency, and therefore when the
   * native currency is a custom gas token, we still use the name `ethChildBalance`
   */
  it(`should return 0x123 parent balance as source balance and 
                    native currency "ETH" child balance as destination balance
    when wallet is connected, 
    destination address is the same as connected wallet, and 
    source chain is Arbitrum Local and 
    destination chain is L3 Local that uses custom gas token`, () => {
    mockedUseNetworks.mockReturnValueOnce([
      {
        sourceChain: getWagmiChain(ChainId.ArbitrumLocal),
        sourceChainProvider: getProviderForChainId(ChainId.ArbitrumLocal),
        destinationChain: getWagmiChain(ChainId.L3Local),
        destinationChainProvider: getProviderForChainId(ChainId.L3Local)
      },
      vi.fn()
    ])

    mockedUseNativeCurrency.mockReturnValueOnce({
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
    source chain is L3 Local that uses custom gas token and 
    destination chain is Arbitrum Local`, () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.L3Local),
        sourceChainProvider: getProviderForChainId(ChainId.L3Local),
        destinationChain: getWagmiChain(ChainId.ArbitrumLocal),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumLocal)
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

    mockedUseArbQueryParams.mockReturnValueOnce([
      useArbQueryParamsWithDestinationAddrMockReturnValue,
      vi.fn()
    ])

    const { result } = renderHook(useNativeCurrencyBalances)
    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(300_000),
      destinationBalance: BigNumber.from(200_000)
    })
  })

  it(`should return zero as source balance and 
                    zero as destination balance
    when wallet is not connected, 
    destination address is not specified, and 
    source chain is Sepolia and 
    destination chain is Arbitrum Sepolia`, () => {
    mockedUseAccount.mockReturnValueOnce(useAccountDisconnectedMockReturnValue)

    mockedUseNetworks.mockReturnValueOnce([
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

  it(`should return zero as source balance and 
                    ETH child balance as destination balance
    when wallet is not connected, 
    destination address is 0xaaa, and 
    source chain is Sepolia and 
    destination chain is Arbitrum Sepolia`, () => {
    mockedUseAccount.mockReturnValueOnce(useAccountDisconnectedMockReturnValue)

    mockedUseArbQueryParams.mockReturnValueOnce([
      {
        ...useArbQueryParamsWithDestinationAddrMockReturnValue,
        sourceChain: ChainId.Sepolia,
        destinationChain: ChainId.ArbitrumSepolia
      },
      vi.fn()
    ])

    mockedUseNetworks.mockReturnValueOnce([
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
      destinationBalance: BigNumber.from(300_000)
    })
  })

  it(`should return zero as source balance and 
                    ETH parent balance as destination balance
    when wallet is not connected, 
    destination address is 0xaaa, and 
    source chain is Arbitrum Sepolia and 
    destination chain is Sepolia`, () => {
    mockedUseAccount.mockReturnValueOnce(useAccountDisconnectedMockReturnValue)

    mockedUseArbQueryParams.mockReturnValueOnce([
      useArbQueryParamsWithDestinationAddrMockReturnValue,
      vi.fn()
    ])

    mockedUseNetworks.mockReturnValueOnce([
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
      sourceBalance: BigNumber.from(0),
      destinationBalance: BigNumber.from(100_000)
    })
  })

  it(`should return zero as source balance and 
                    0x123 parent balance as destination balance
    when wallet is not connected, 
    destination address is 0xaaa, and 
    source chain is L3 Local that uses custom gas token and 
    destination chain is Arbitrum Local`, () => {
    mockedUseAccount.mockReturnValueOnce(useAccountDisconnectedMockReturnValue)

    mockedUseArbQueryParams.mockReturnValueOnce([
      {
        ...useArbQueryParamsWithDestinationAddrMockReturnValue,
        sourceChain: ChainId.L3Local,
        destinationChain: ChainId.ArbitrumLocal
      },
      vi.fn()
    ])

    mockedUseNativeCurrency.mockReturnValueOnce({
      isCustom: true,
      address: '0x123',
      name: 'Custom Token',
      symbol: 'CT',
      decimals: 18
    })

    mockedUseNetworks.mockReturnValueOnce([
      {
        sourceChain: getWagmiChain(ChainId.L3Local),
        sourceChainProvider: getProviderForChainId(ChainId.L3Local),
        destinationChain: getWagmiChain(ChainId.ArbitrumLocal),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumLocal)
      },
      vi.fn()
    ])

    const { result } = renderHook(useNativeCurrencyBalances)
    expect(result.current).toEqual({
      sourceBalance: BigNumber.from(0),
      destinationBalance: BigNumber.from(200_000)
    })
  })
})
