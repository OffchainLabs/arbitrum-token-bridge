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
const Container = ({ children }: PropsWithChildren<{}>) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
)

describe('useBalance', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('getter return null for undefined walletAddress', async () => {
    const provider = new StaticJsonRpcProvider(
      process.env.REACT_APP_ETHEREUM_RPC_URL,
      1
    )

    // This should not be called. It's here to avoid false positive
    jest
      .spyOn(provider, 'getBalance')
      .mockImplementation(() => Promise.resolve(BigNumber.from(12)))
    jest.spyOn(MultiCaller.prototype, 'getTokenData').mockImplementation(() =>
      Promise.resolve([
        {
          balance: BigNumber.from(10)
        }
      ])
    )

    const erc20 = ['0x0000000000000000000000000000000000000000']
    const { result, waitForNextUpdate } = renderHook(
      () =>
        useBalance({
          provider,
          walletAddress: undefined,
          erc20Addresses: erc20
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

    expect(ethBalance).toBeNull()
    expect(erc20Balances).toBeNull()
  })

  it('getter return null for missing chainId', async () => {
    const provider = new StaticJsonRpcProvider(
      process.env.REACT_APP_ETHEREUM_RPC_URL
    )

    // @ts-ignore
    jest.spyOn(provider, 'getNetwork').mockImplementation(() => ({
      chainId: undefined
    }))
    // This should not be called. It's here to avoid false positive
    jest
      .spyOn(provider, 'getBalance')
      .mockImplementation(() => Promise.resolve(BigNumber.from(22)))
    jest.spyOn(MultiCaller.prototype, 'getTokenData').mockImplementation(() =>
      Promise.resolve([
        {
          balance: BigNumber.from(10)
        }
      ])
    )

    const erc20 = ['0x0000000000000000000000000000000000000000']
    const { result, waitForNextUpdate } = renderHook(
      () =>
        useBalance({
          provider,
          walletAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239',
          erc20Addresses: erc20
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
  })

  it('getter return ETH balance for valid tuple (walletAddress, chainId)', async () => {
    const provider = new StaticJsonRpcProvider(
      process.env.REACT_APP_ETHEREUM_RPC_URL,
      1
    )

    jest
      .spyOn(provider, 'getBalance')
      .mockImplementation(() => Promise.resolve(BigNumber.from(10)))

    const { result, waitForNextUpdate } = renderHook(
      () =>
        useBalance({
          provider,
          walletAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239'
        }),
      { wrapper: Container }
    )

    await waitForNextUpdate({ timeout: 100 })
    expect(result.current.eth[0]?.toNumber()).toEqual(10)
  })

  it('setter update ETH balance ', async () => {
    const provider = new StaticJsonRpcProvider(
      process.env.REACT_APP_ETHEREUM_RPC_URL,
      1
    )

    jest
      .spyOn(provider, 'getBalance')
      .mockImplementationOnce(() => Promise.resolve(BigNumber.from(30)))
      .mockImplementationOnce(() => Promise.resolve(BigNumber.from(40)))

    const { result, waitForNextUpdate } = renderHook(
      () =>
        useBalance({
          provider,
          walletAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239'
        }),
      { wrapper: Container }
    )

    await waitForNextUpdate({ timeout: 100 })

    const {
      current: {
        eth: [ethBalance, updateEthBalance]
      }
    } = result

    expect(ethBalance?.toNumber()).toEqual(30)

    updateEthBalance()
    await waitForNextUpdate({ timeout: 100 })

    const {
      current: {
        eth: [ethBalanceUpdated]
      }
    } = result

    expect(ethBalanceUpdated?.toNumber()).toBe(40)
  })

  it('getter return ERC20 balance for valid tuple (walletAddress, chainId)', async () => {
    const provider = new StaticJsonRpcProvider(
      process.env.REACT_APP_ETHEREUM_RPC_URL,
      1
    )

    jest.spyOn(MultiCaller.prototype, 'getTokenData').mockImplementation(() =>
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

    const erc20 = [
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000001',
      '0x0000000000000000000000000000000000000002'
    ]
    const { result, waitForValueToChange } = renderHook(
      () =>
        useBalance({
          provider,
          walletAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239',
          erc20Addresses: erc20
        }),
      { wrapper: Container }
    )

    await waitForValueToChange(() => result.current.erc20, { timeout: 100 })
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
  })

  it('setter update ERC20 balance and merge data', async () => {
    const provider = new StaticJsonRpcProvider(
      process.env.REACT_APP_ETHEREUM_RPC_URL,
      1
    )
    jest.spyOn(MultiCaller.prototype, 'getTokenData').mockImplementation(() =>
      Promise.resolve([
        {
          balance: BigNumber.from(11)
        },
        {
          balance: BigNumber.from(22)
        }
      ])
    )

    const erc20 = [
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000001'
    ]
    const { result, waitForValueToChange } = renderHook(
      () =>
        useBalance({
          provider,
          walletAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239',
          erc20Addresses: erc20
        }),
      { wrapper: Container }
    )

    await waitForValueToChange(() => result.current.erc20, { timeout: 100 })

    const {
      current: {
        erc20: [erc20Balances, updateErc20Balances]
      }
    } = result

    expect(erc20Balances).toEqual({
      '0x0000000000000000000000000000000000000000': BigNumber.from(11),
      '0x0000000000000000000000000000000000000001': BigNumber.from(22)
    })

    await act(async () => {
      updateErc20Balances({
        '0x0000000000000000000000000000000000000001': BigNumber.from(25),
        '0x0000000000000000000000000000000000000002': BigNumber.from(33)
      })
      await waitForValueToChange(() => result.current.erc20, { timeout: 500 })

      /**
       * 0x..0 is untouched
       * 0x..1 is updated
       * 0x..2 is added
       */
      expect(result.current.erc20[0]).toEqual({
        '0x0000000000000000000000000000000000000000': BigNumber.from(11),
        '0x0000000000000000000000000000000000000001': BigNumber.from(25),
        '0x0000000000000000000000000000000000000002': BigNumber.from(33)
      })
    })
  })
})
