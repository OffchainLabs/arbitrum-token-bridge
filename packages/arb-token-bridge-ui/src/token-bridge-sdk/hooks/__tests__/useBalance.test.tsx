/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react-hooks'
import { useBalance } from '../useBalance'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { SWRConfig } from 'swr'
import { PropsWithChildren } from 'react'
import { MultiCaller } from '@arbitrum/sdk'

// Create a new cache for every test
const Container = ({ children }: PropsWithChildren<unknown>) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
)

const walletAddress = '0x58b6a8a3302369daec383334672404ee733ab239'

describe('useBalance', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('getter return null for undefined walletAddress', async () => {
    const provider = new StaticJsonRpcProvider(
      process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
      1
    )

    // This should not be called. It's here to avoid false positive
    const getBalanceSpy = jest.spyOn(provider, 'getBalance')
    getBalanceSpy.mockImplementationOnce(() =>
      Promise.resolve(BigNumber.from(12))
    )
    const getTokenDataSpy = jest.spyOn(MultiCaller.prototype, 'getTokenData')
    getTokenDataSpy.mockImplementationOnce(() =>
      Promise.resolve([
        {
          balance: BigNumber.from(10)
        }
      ])
    )

    const { result, waitForNextUpdate } = renderHook(
      () =>
        useBalance({
          provider,
          walletAddress: undefined
        }),
      { wrapper: Container }
    )

    await waitForNextUpdate({ timeout: 250 })

    const {
      current: {
        eth: [ethBalance],
        erc20: [erc20Balances]
      }
    } = result

    expect(getBalanceSpy).not.toHaveBeenCalled()
    expect(getTokenDataSpy).not.toHaveBeenCalled()
    expect(ethBalance).toBeNull()
    expect(erc20Balances).toBeNull()
  })

  it('getter return null for missing chainId', async () => {
    const provider = new StaticJsonRpcProvider(
      process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL
    )

    // @ts-ignore : mock implementation of getNetwork
    jest.spyOn(provider, 'getNetwork').mockImplementation(() => ({
      chainId: undefined
    }))
    // This should not be called. It's here to avoid false positive
    const getBalanceSpy = jest.spyOn(provider, 'getBalance')
    getBalanceSpy.mockImplementationOnce(() =>
      Promise.resolve(BigNumber.from(22))
    )
    const getTokenDataSpy = jest.spyOn(MultiCaller.prototype, 'getTokenData')
    getTokenDataSpy.mockImplementationOnce(() =>
      Promise.resolve([
        {
          balance: BigNumber.from(20)
        }
      ])
    )

    const { result, waitForNextUpdate } = renderHook(
      () =>
        useBalance({
          provider,
          walletAddress
        }),
      { wrapper: Container }
    )

    try {
      await waitForNextUpdate({ timeout: 100 })
    } catch (err) {}

    const {
      current: {
        eth: [ethBalance],
        erc20: [erc20Balances]
      }
    } = result

    expect(ethBalance).toBeNull()
    expect(erc20Balances).toBeNull()
    expect(getBalanceSpy).not.toHaveBeenCalled()
    expect(getTokenDataSpy).not.toHaveBeenCalled()
  })

  describe('ETH Balance', () => {
    it('getter return ETH balance for valid tuple (walletAddress, chainId)', async () => {
      const provider = new StaticJsonRpcProvider(
        process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
        1
      )

      const getBalanceSpy = jest.spyOn(provider, 'getBalance')
      getBalanceSpy.mockImplementationOnce(() =>
        Promise.resolve(BigNumber.from(32))
      )
      const getTokenDataSpy = jest.spyOn(MultiCaller.prototype, 'getTokenData')
      getTokenDataSpy.mockImplementationOnce(() =>
        Promise.resolve([
          {
            balance: BigNumber.from(30)
          }
        ])
      )

      const { result, waitForNextUpdate } = renderHook(
        () =>
          useBalance({
            provider,
            walletAddress
          }),
        { wrapper: Container }
      )

      await waitForNextUpdate({ timeout: 100 })
      expect(result.current.eth[0]?.toNumber()).toEqual(32)
      expect(getBalanceSpy).toHaveBeenCalledTimes(1)
      expect(getBalanceSpy).toHaveBeenCalledWith(walletAddress)
      expect(getTokenDataSpy).not.toHaveBeenCalled()
    })

    it('setter update ETH balance', async () => {
      const provider = new StaticJsonRpcProvider(
        process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
        1
      )

      const getBalanceSpy = jest.spyOn(provider, 'getBalance')
      getBalanceSpy
        .mockImplementationOnce(() => Promise.resolve(BigNumber.from(42)))
        .mockImplementationOnce(() => Promise.resolve(BigNumber.from(52)))
      const getTokenDataSpy = jest.spyOn(MultiCaller.prototype, 'getTokenData')
      getTokenDataSpy.mockImplementationOnce(() =>
        Promise.resolve([
          {
            balance: BigNumber.from(40)
          }
        ])
      )

      const { result, waitForNextUpdate } = renderHook(
        () =>
          useBalance({
            provider,
            walletAddress
          }),
        { wrapper: Container }
      )

      await waitForNextUpdate({ timeout: 100 })

      const {
        current: {
          eth: [ethBalance, updateEthBalance]
        }
      } = result

      expect(ethBalance?.toNumber()).toEqual(42)
      expect(getBalanceSpy).toHaveBeenCalledTimes(1)
      expect(getBalanceSpy).toHaveBeenCalledWith(walletAddress)

      updateEthBalance()
      await waitForNextUpdate({ timeout: 100 })

      const {
        current: {
          eth: [ethBalanceUpdated]
        }
      } = result

      expect(ethBalanceUpdated?.toNumber()).toBe(52)
      expect(getBalanceSpy).toHaveBeenCalledTimes(2)
      expect(getBalanceSpy).toHaveBeenLastCalledWith(walletAddress)
      expect(getTokenDataSpy).not.toHaveBeenCalled()
    })
  })

  describe('ERC20 Balance', () => {
    it('getter return ERC20 balance for valid tuple (walletAddress, chainId)', async () => {
      const provider = new StaticJsonRpcProvider(
        process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
        1
      )

      const getBalanceSpy = jest.spyOn(provider, 'getBalance')
      getBalanceSpy.mockImplementationOnce(() =>
        Promise.resolve(BigNumber.from(62))
      )
      const getTokenDataSpy = jest.spyOn(MultiCaller.prototype, 'getTokenData')
      getTokenDataSpy.mockImplementationOnce(() =>
        Promise.resolve([
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
      )

      const { result, waitForValueToChange } = renderHook(
        () =>
          useBalance({
            provider,
            walletAddress
          }),
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
      updateErc20Balances(erc20)

      await waitForValueToChange(() => result.current.erc20, { timeout: 100 })

      expect(result.current.erc20[0]).toEqual({
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

    it('setter update ERC20 balance and merge data', async () => {
      const provider = new StaticJsonRpcProvider(
        process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
        1
      )
      const getBalanceSpy = jest.spyOn(provider, 'getBalance')
      getBalanceSpy.mockImplementationOnce(() =>
        Promise.resolve(BigNumber.from(72))
      )
      const getTokenDataSpy = jest.spyOn(MultiCaller.prototype, 'getTokenData')
      getTokenDataSpy.mockImplementationOnce(() =>
        Promise.resolve([
          {
            balance: BigNumber.from(11)
          },
          {
            balance: BigNumber.from(22)
          }
        ])
      )

      const { result, waitForValueToChange } = renderHook(
        () =>
          useBalance({
            provider,
            walletAddress
          }),
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
      updateErc20Balances(erc20)

      await waitForValueToChange(() => result.current.erc20, { timeout: 100 })

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
        getTokenDataSpy.mockImplementationOnce(() =>
          Promise.resolve([
            {
              balance: BigNumber.from(25) // '0xAaADDD0000000000000000000000000000000001',
            },
            {
              balance: BigNumber.from(33) // '0xAAAAAA0000000000000000000000000000000002'
            }
          ])
        )

        const newAddresses = [
          '0xAaADDD0000000000000000000000000000000001',
          '0xAAAAAA0000000000000000000000000000000002'
        ]
        updateErc20Balances(newAddresses)
        await waitForValueToChange(() => result.current.erc20, { timeout: 500 })

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
  })
})
