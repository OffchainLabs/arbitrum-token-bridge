import { renderHook } from '@testing-library/react'
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'

import { getWagmiChain } from '../../util/wagmi/getWagmiChain'
import { ChainId } from '../../util/networks'
import { CommonAddress } from '../../util/CommonAddressUtils'

import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import {
  getChildUsdcAddress,
  useParentUsdcAddress
} from '../CCTP/useUpdateUsdcBalances'
import { useNetworks } from '../useNetworks'
import { orbitMainnets, orbitTestnets } from '../../util/orbitChainsList'
import { getL2ERC20Address } from '../../util/TokenUtils'

jest.mock('../useNetworks', () => ({
  useNetworks: jest.fn()
}))

jest.mock('../../util/TokenUtils', () => ({
  getL2ERC20Address: jest.fn()
}))

const xaiTestnetChainId = 37714555429
const polterTestnetChainId = 631571
const geistMainnetChainId = 63157

describe('useParentUsdcAddress', () => {
  const mockedUseNetworks = jest.mocked(useNetworks)

  beforeAll(() => {
    const xaiTestnet = orbitTestnets[xaiTestnetChainId]

    if (!xaiTestnet) {
      throw new Error(`Could not find Xai Testnet in the Orbit chains list.`)
    }

    registerCustomArbitrumNetwork(xaiTestnet)

    const polterTestnet = orbitTestnets[polterTestnetChainId]

    if (!polterTestnet) {
      throw new Error(`Could not find Polter Testnet in the Orbit chains list.`)
    }

    registerCustomArbitrumNetwork(polterTestnet)

    const geistMainnet = orbitMainnets[geistMainnetChainId]

    if (!geistMainnet) {
      throw new Error(`Could not find Geist Mainnet in the Orbit chains list.`)
    }

    registerCustomArbitrumNetwork(geistMainnet)
  })

  it('should return native USDC address on Ethereum when source chain is Ethereum and destination chain is Arbitrum One', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Ethereum),
        sourceChainProvider: getProviderForChainId(ChainId.Ethereum),
        destinationChain: getWagmiChain(ChainId.ArbitrumOne),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumOne)
      },
      jest.fn()
    ])

    const { result } = renderHook(useParentUsdcAddress)
    expect(result.current).toEqual(CommonAddress.Ethereum.USDC)
  })

  it('should return native USDC address on Ethereum when source chain is Arbitrum One and destination chain is Ethereum', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.ArbitrumOne),
        sourceChainProvider: getProviderForChainId(ChainId.ArbitrumOne),
        destinationChain: getWagmiChain(ChainId.Ethereum),
        destinationChainProvider: getProviderForChainId(ChainId.Ethereum)
      },
      jest.fn()
    ])

    const { result } = renderHook(useParentUsdcAddress)
    expect(result.current).toEqual(CommonAddress.Ethereum.USDC)
  })

  it('should return native USDC address on Sepolia when source chain is Sepolia and destination chain is Arbitrum Sepolia', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Sepolia),
        sourceChainProvider: getProviderForChainId(ChainId.Sepolia),
        destinationChain: getWagmiChain(ChainId.ArbitrumSepolia),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia)
      },
      jest.fn()
    ])

    const { result } = renderHook(useParentUsdcAddress)
    expect(result.current).toEqual(CommonAddress.Sepolia.USDC)
  })

  it('should return native USDC address on Sepolia when source chain is Arbitrum Sepolia and destination chain is Sepolia', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.ArbitrumSepolia),
        sourceChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia),
        destinationChain: getWagmiChain(ChainId.Sepolia),
        destinationChainProvider: getProviderForChainId(ChainId.Sepolia)
      },
      jest.fn()
    ])

    const { result } = renderHook(useParentUsdcAddress)
    expect(result.current).toEqual(CommonAddress.Sepolia.USDC)
  })

  it('should return native USDC address on Arbitrum Sepolia when source chain is Arbitrum Sepolia and destination chain is an L3 Orbit chain on top of Arbitrum Sepolia, e.g. Xai Testnet', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.ArbitrumSepolia),
        sourceChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia),
        destinationChain: getWagmiChain(xaiTestnetChainId as ChainId),
        destinationChainProvider: getProviderForChainId(
          xaiTestnetChainId as ChainId
        )
      },
      jest.fn()
    ])

    const { result } = renderHook(useParentUsdcAddress)
    expect(result.current).toEqual(CommonAddress.ArbitrumSepolia.USDC)
  })

  it('should return native USDC address on Arbitrum Sepolia when source chain is an L3 Orbit chain on top of Arbitrum Sepolia, e.g. Xai Testnet, and destination chain is Arbitrum Sepolia', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(xaiTestnetChainId as ChainId),
        sourceChainProvider: getProviderForChainId(
          xaiTestnetChainId as ChainId
        ),
        destinationChain: getWagmiChain(ChainId.ArbitrumSepolia),
        destinationChainProvider: getProviderForChainId(ChainId.ArbitrumSepolia)
      },
      jest.fn()
    ])

    const { result } = renderHook(useParentUsdcAddress)
    expect(result.current).toEqual(CommonAddress.ArbitrumSepolia.USDC)
  })

  it('should return undefined when source chain is Base and destination chain is an L3 Orbit chain on top of Base, e.g. Geist Mainnet', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.Base),
        sourceChainProvider: getProviderForChainId(ChainId.Base),
        destinationChain: getWagmiChain(geistMainnetChainId),
        destinationChainProvider: getProviderForChainId(
          geistMainnetChainId as ChainId
        )
      },
      jest.fn()
    ])

    const { result } = renderHook(useParentUsdcAddress)
    expect(result.current).toEqual(undefined)
  })

  it('should return undefined when source chain is an L3 Orbit chain on top of Base, e.g. Geist Mainnet, and destination chain is Base', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(geistMainnetChainId),
        sourceChainProvider: getProviderForChainId(
          geistMainnetChainId as ChainId
        ),
        destinationChain: getWagmiChain(ChainId.Base),
        destinationChainProvider: getProviderForChainId(ChainId.Base)
      },
      jest.fn()
    ])

    const { result } = renderHook(useParentUsdcAddress)
    expect(result.current).toEqual(undefined)
  })

  it('should return undefined when source chain is Base Sepolia and destination chain is an L3 Orbit chain on top of Base Sepolia, e.g. Polter Testnet', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(ChainId.BaseSepolia),
        sourceChainProvider: getProviderForChainId(ChainId.BaseSepolia),
        destinationChain: getWagmiChain(polterTestnetChainId),
        destinationChainProvider: getProviderForChainId(
          polterTestnetChainId as ChainId
        )
      },
      jest.fn()
    ])

    const { result } = renderHook(useParentUsdcAddress)
    expect(result.current).toEqual(undefined)
  })

  it('should return undefined when source chain is an L3 Orbit chain on top of Base Sepolia, e.g. Polter Testnet, and destination chain is Base Sepolia', () => {
    mockedUseNetworks.mockReturnValue([
      {
        sourceChain: getWagmiChain(polterTestnetChainId),
        sourceChainProvider: getProviderForChainId(
          polterTestnetChainId as ChainId
        ),
        destinationChain: getWagmiChain(ChainId.BaseSepolia),
        destinationChainProvider: getProviderForChainId(ChainId.BaseSepolia)
      },
      jest.fn()
    ])

    const { result } = renderHook(useParentUsdcAddress)
    expect(result.current).toEqual(undefined)
  })
})

describe('getChildUsdcAddress', () => {
  it('should return native USDC address on Arbitrum One when parent USDC address is native USDC on Ethereum, parent chain is Ethereum, and child chain is Arbitrum One', async () => {
    const result = await getChildUsdcAddress([
      CommonAddress.Ethereum.USDC,
      ChainId.Ethereum,
      ChainId.ArbitrumOne
    ])

    expect(result).toEqual(CommonAddress.ArbitrumOne.USDC)
    expect(result).not.toEqual(CommonAddress.ArbitrumOne['USDC.e'])
  })

  it('should return native USDC address on Arbitrum Sepolia when parent USDC address is native USDC on Sepolia, parent chain is Sepolia, and child chain is Arbitrum Sepolia', async () => {
    const result = await getChildUsdcAddress([
      CommonAddress.Sepolia.USDC,
      ChainId.Sepolia,
      ChainId.ArbitrumSepolia
    ])

    expect(result).toEqual(CommonAddress.ArbitrumSepolia.USDC)
    expect(result).not.toEqual(CommonAddress.ArbitrumSepolia['USDC.e'])
  })

  it('should return USDC address on Xai Testnet when parent USDC address is native USDC on Arbitrum Sepolia, parent chain is Arbitrum Sepolia, and child chain is Xai Testnet', async () => {
    const mockedGetL2ERC20Address = jest
      .mocked(getL2ERC20Address)
      .mockResolvedValueOnce('0xBd8C9bFBB225bFF89C7884060338150dAA626Edb')

    const result = await getChildUsdcAddress([
      CommonAddress.ArbitrumSepolia.USDC,
      ChainId.ArbitrumSepolia,
      xaiTestnetChainId
    ])

    expect(result).toEqual('0xBd8C9bFBB225bFF89C7884060338150dAA626Edb')
    expect(mockedGetL2ERC20Address).toHaveBeenCalledTimes(1)
  })
})
