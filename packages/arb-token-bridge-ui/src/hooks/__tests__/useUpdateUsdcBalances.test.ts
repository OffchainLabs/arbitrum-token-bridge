import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ChainId } from '../../types/ChainId'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { getL2ERC20Address } from '../../util/TokenUtils'
import {
  getChildUsdcAddress,
  getParentUsdcAddress
} from '../CCTP/useUpdateUsdcBalances'

vi.mock('../../util/TokenUtils', () => ({
  getL2ERC20Address: vi.fn()
}))

const xaiTestnetChainId = 37714555429 as ChainId
const plumeTestnetChainId = 98867 as ChainId

describe('getParentUsdcAddress', () => {
  it('should return native USDC address on Ethereum when parent chain is Ethereum (1)', () => {
    const result = getParentUsdcAddress(ChainId.Ethereum)
    expect(result).toEqual(CommonAddress.Ethereum.USDC)
  })

  it('should return native USDC address on Sepolia when parent chain is Sepolia (11155111)', () => {
    const result = getParentUsdcAddress(ChainId.Sepolia)
    expect(result).toEqual(CommonAddress.Sepolia.USDC)
  })

  it('should return native USDC address on Arbitrum One when parent chain is Arbitrum One (42161)', () => {
    const result = getParentUsdcAddress(ChainId.ArbitrumOne)
    expect(result).toEqual(CommonAddress.ArbitrumOne.USDC)
  })

  it('should return native USDC address on Arbitrum Sepolia when parent chain is Arbitrum Sepolia (421614)', () => {
    const result = getParentUsdcAddress(ChainId.ArbitrumSepolia)
    expect(result).toEqual(CommonAddress.ArbitrumSepolia.USDC)
  })

  it('should return undefined when parent chain is Base (8453)', () => {
    const result = getParentUsdcAddress(ChainId.Base)
    expect(result).toEqual(undefined)
  })

  it('should return undefined when parent chain is Base Sepolia (84532)', () => {
    const result = getParentUsdcAddress(ChainId.BaseSepolia)
    expect(result).toEqual(undefined)
  })
})

describe.sequential('getChildUsdcAddress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return native USDC address on Arbitrum One when parent USDC address is native USDC on Ethereum, parent chain is Ethereum, and child chain is Arbitrum One', async () => {
    const result = await getChildUsdcAddress({
      parentChainId: ChainId.Ethereum,
      childChainId: ChainId.ArbitrumOne
    })

    expect(result).toEqual(CommonAddress.ArbitrumOne.USDC)
  })

  it('should return native USDC address on Arbitrum Sepolia when parent USDC address is native USDC on Sepolia, parent chain is Sepolia, and child chain is Arbitrum Sepolia', async () => {
    const result = await getChildUsdcAddress({
      parentChainId: ChainId.Sepolia,
      childChainId: ChainId.ArbitrumSepolia
    })

    expect(result).toEqual(CommonAddress.ArbitrumSepolia.USDC)
  })

  it('should return USDC address on Xai Testnet when parent USDC address is native USDC on Arbitrum Sepolia, parent chain is Arbitrum Sepolia, and child chain is Xai Testnet', async () => {
    const mockedGetL2ERC20Address = vi
      .mocked(getL2ERC20Address)
      .mockResolvedValueOnce('0xBd8C9bFBB225bFF89C7884060338150dAA626Edb')

    const result = await getChildUsdcAddress({
      parentChainId: ChainId.ArbitrumSepolia,
      childChainId: xaiTestnetChainId
    })

    expect(result).toEqual('0xBd8C9bFBB225bFF89C7884060338150dAA626Edb')
    expect(mockedGetL2ERC20Address).toHaveBeenCalledTimes(1)
  })

  it('should return USDC address on Plume Testnet when parent USDC address is native USDC on Sepolia, parent chain is Sepolia, and child chain is Plume Testnet', async () => {
    const mockedGetL2ERC20Address = vi
      .mocked(getL2ERC20Address)
      .mockResolvedValueOnce('0x581750f705ca63bd7623fd07d54d33124b32e171')

    const result = await getChildUsdcAddress({
      parentChainId: ChainId.Sepolia,
      childChainId: plumeTestnetChainId
    })

    expect(result).toEqual('0x581750f705ca63bd7623fd07d54d33124b32e171')
    expect(mockedGetL2ERC20Address).toHaveBeenCalledTimes(1)
  })
})
