import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { SWRConfig } from 'swr'
import { PropsWithChildren } from 'react'
import { MultiCaller } from '@arbitrum/sdk'
import { env } from '../../config/env'

import { useBalance } from '../useBalance'
import { useNetworks } from '../useNetworks'
import { useWallet } from '../useWallet'
import { useArbQueryParams } from '../useArbQueryParams'
import { useAppState } from '../useAppState'
import { useChainLayers } from '../useChainLayers'
import { useNetworksAndSigners } from '../useNetworksAndSigners'
import { useTokens } from '../useTokens'
import { useIsConnectedToArbitrum } from '../useIsConnectedToArbitrum'
import { useIsConnectedToOrbit } from '../useIsConnectedToOrbit'
import { useIsTestingEnvironment } from '../useIsTestingEnvironment'

// Create a new cache for every test
const Container = ({ children }: PropsWithChildren<unknown>) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
)

const walletAddress = '0x58b6a8a3302369daec383334672404ee733ab239'

const provider = new StaticJsonRpcProvider(env.NEXT_PUBLIC_RPC_URL_ETHEREUM, 1)

describe.sequential('useBalance', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    vi.mock('../../token-bridge-sdk/utils', () => ({
      getProviderForChainId: () => provider
    }))
  })

  it('getter returns null for undefined walletAddress', async () => {
    // This should not be called. It's here to avoid false positive
    const getBalanceSpy = vi
      .spyOn(provider, 'getBalance')
      .mockResolvedValueOnce(BigNumber.from(12))
    const getTokenDataSpy = vi
      .spyOn(MultiCaller.prototype, 'getTokenData')
      .mockResolvedValueOnce(BigNumber.from(10))

    const { result } = renderHook(
      () => useBalance({ chainId: 1, walletAddress: undefined }),
      { wrapper: Container }
    )

    await waitFor(() => {
      const {
        current: {
          eth: [ethBalance],
          erc20: [erc20Balances]
        }
      } = result

      expect(ethBalance).toBeNull()
      expect(erc20Balances).toBeNull()
    })

    expect(getBalanceSpy).not.toHaveBeenCalled()
    expect(getTokenDataSpy).not.toHaveBeenCalled()
  })

  describe('ETH Balance', () => {
    it('getter returns ETH balance for valid tuple (walletAddress, chainId)', async () => {
      const getBalanceSpy = vi
        .spyOn(provider, 'getBalance')
        .mockResolvedValueOnce(BigNumber.from(32))
      const getTokenDataSpy = vi
        .spyOn(MultiCaller.prototype, 'getTokenData')
        .mockResolvedValueOnce(BigNumber.from(30))

      const { result } = renderHook(
        () => useBalance({ chainId: 1, walletAddress }),
        { wrapper: Container }
      )

      await waitFor(
        () => {
          const {
            current: {
              eth: [ethBalance],
              erc20: []
            }
          } = result

          expect(ethBalance?.toNumber()).toEqual(32)
        },
        { timeout: 2000 }
      )

      expect(getBalanceSpy).toHaveBeenCalledTimes(1)
      expect(getBalanceSpy).toHaveBeenCalledWith(walletAddress)
      expect(getTokenDataSpy).not.toHaveBeenCalled()
    })

    it('setter updates ETH balance', async () => {
      const getBalanceSpy = vi
        .spyOn(provider, 'getBalance')
        .mockResolvedValueOnce(BigNumber.from(42))
        .mockResolvedValueOnce(BigNumber.from(52))
      const getTokenDataSpy = vi
        .spyOn(MultiCaller.prototype, 'getTokenData')
        .mockResolvedValueOnce(BigNumber.from(40))

      const { result } = renderHook(
        () => useBalance({ chainId: 1, walletAddress }),
        { wrapper: Container }
      )

      await waitFor(() => {
        const {
          current: {
            eth: [ethBalance]
          }
        } = result
        expect(ethBalance?.toNumber()).toEqual(42)
      })

      const {
        current: {
          eth: [, updateEthBalance]
        }
      } = result

      await act(async () => {
        updateEthBalance()
      })

      await waitFor(() => {
        const {
          current: {
            eth: [ethBalanceUpdated]
          }
        } = result
        expect(ethBalanceUpdated?.toNumber()).toBe(52)
      })

      expect(getBalanceSpy).toHaveBeenCalledTimes(2)
      expect(getBalanceSpy).toHaveBeenLastCalledWith(walletAddress)
      expect(getTokenDataSpy).not.toHaveBeenCalled()
    })
  })
})

describe.sequential('ERC20 Balance', () => {
  it('getter returns ERC20 balance for valid tuple (walletAddress, chainId)', async () => {
    const getBalanceSpy = vi
      .spyOn(provider, 'getBalance')
      .mockResolvedValueOnce(BigNumber.from(62))
    const getTokenDataSpy = vi
      .spyOn(MultiCaller.prototype, 'getTokenData')
      .mockResolvedValueOnce([
        {
          balance: BigNumber.from(10)
        },
        {
          balance: BigNumber.from(5)
        },
        {
          balance: BigNumber.from(20)
        }
      ])

    const { result } = renderHook(
      () => useBalance({ chainId: 1, walletAddress }),
      { wrapper: Container }
    )
    const {
      current: {
        erc20: [, updateErc20Balances]
      }
    } = result

    const erc20 = [
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000001',
      '0x0000000000000000000000000000000000000002'
    ]
    await act(async () => updateErc20Balances(erc20))

    const {
      current: {
        erc20: [erc20Balances]
      }
    } = result
    expect(erc20Balances).toEqual({
      '0x0000000000000000000000000000000000000000': BigNumber.from(10),
      '0x0000000000000000000000000000000000000001': BigNumber.from(5),
      '0x0000000000000000000000000000000000000002': BigNumber.from(20)
    })

    expect(getBalanceSpy).toHaveBeenCalledTimes(1)
    expect(getTokenDataSpy).toHaveBeenCalledTimes(1)
    expect(getTokenDataSpy).toHaveBeenCalledWith(erc20, {
      balanceOf: { account: walletAddress }
    })
  })

  it('setter updates ERC20 balance and merges data', async () => {
    const getBalanceSpy = vi
      .spyOn(provider, 'getBalance')
      .mockResolvedValueOnce(BigNumber.from(72))
    const getTokenDataSpy = vi
      .spyOn(MultiCaller.prototype, 'getTokenData')
      .mockResolvedValueOnce([
        {
          balance: BigNumber.from(11)
        },
        {
          balance: BigNumber.from(22)
        }
      ])

    const { result } = renderHook(
      () => useBalance({ chainId: 1, walletAddress }),
      { wrapper: Container }
    )

    const {
      current: {
        erc20: [, updateErc20Balances]
      }
    } = result

    const erc20 = [
      '0xABCdef0000000000000000000000000000000000',
      '0xAAADDD0000000000000000000000000000000001'
    ]

    await act(async () => updateErc20Balances(erc20))

    const {
      current: {
        erc20: [erc20Balances]
      }
    } = result
    expect(erc20Balances).toEqual({
      '0xabcdef0000000000000000000000000000000000': BigNumber.from(11),
      '0xaaaddd0000000000000000000000000000000001': BigNumber.from(22)
    })
    expect(getTokenDataSpy).toHaveBeenCalledTimes(1)
    expect(getTokenDataSpy).toHaveBeenCalledWith(erc20, {
      balanceOf: { account: walletAddress }
    })
    await act(async () => {
      getTokenDataSpy.mockResolvedValueOnce([
        {
          balance: BigNumber.from(25) // '0xAaADDD0000000000000000000000000000000001',
        },
        {
          balance: BigNumber.from(33) // '0xAAAAAA0000000000000000000000000000000002'
        }
      ])
    })
    const newAddresses = [
      '0xAaADDD0000000000000000000000000000000001',
      '0xAAAAAA0000000000000000000000000000000002'
    ]

    await act(async () => updateErc20Balances(newAddresses))

    /**
     * 0x..0 is untouched
     * 0x..1 is updated
     * 0x..2 is added
     *
     * All balances are stored in lowercase
     */
    expect(result.current.erc20[0]).toEqual({
      '0xabcdef0000000000000000000000000000000000': BigNumber.from(11),
      '0xaaaddd0000000000000000000000000000000001': BigNumber.from(25),
      '0xaaaaaa0000000000000000000000000000000002': BigNumber.from(33)
    })
    expect(getBalanceSpy).toHaveBeenCalledTimes(1)
    expect(getTokenDataSpy).toHaveBeenCalledTimes(2)
    expect(getTokenDataSpy).toHaveBeenLastCalledWith(newAddresses, {
      balanceOf: { account: walletAddress }
    })
  })
})
