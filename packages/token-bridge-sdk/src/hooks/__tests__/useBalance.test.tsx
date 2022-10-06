/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react-hooks'
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

    const { result, waitForNextUpdate } = await renderHook(
      () =>
        useBalance({
          provider,
          walletAddress: undefined
        }),
      { wrapper: Container }
    )

    try {
      await waitForNextUpdate({ timeout: 100 })
    } catch (err) {}

    const {
      current: {
        eth: [ethBalance]
      }
    } = result

    expect(ethBalance).toBeNull()
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

    const { result, waitForNextUpdate } = await renderHook(
      () =>
        useBalance({
          provider,
          walletAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239'
        }),
      { wrapper: Container }
    )

    try {
      await waitForNextUpdate({ timeout: 100 })
    } catch (err) {}

    const {
      current: {
        eth: [ethBalance]
      }
    } = result

    expect(ethBalance).toBeNull()
  })

  it('getter return ETH balance for valid tuple (walletAddress, chainId)', async () => {
    const provider = new StaticJsonRpcProvider(
      process.env.REACT_APP_ETHEREUM_RPC_URL,
      1
    )

    jest.spyOn(provider, 'getBalance').mockImplementation(() => {
      return Promise.resolve(BigNumber.from(10))
    })

    const { result, waitForNextUpdate } = await renderHook(
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
        eth: [ethBalance]
      }
    } = result

    expect(ethBalance?.toNumber()).toEqual(10)
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

    const { result, waitForNextUpdate } = await renderHook(
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

  // it('getter return ERC20 balance for valid tuple (walletAddress, chainId)', async () => {
  //   const provider = new StaticJsonRpcProvider(
  //     process.env.REACT_APP_ETHEREUM_RPC_URL,
  //     1
  //   )
  //   jest
  //     .spyOn(MultiCaller.prototype, 'getTokenData')
  //     .mockImplementationOnce(() => Promise.resolve(BigNumber.from(30)))
  //     .mockImplementationOnce(() => Promise.resolve(BigNumber.from(40)))

  //   const { result, waitForNextUpdate } = await renderHook(
  //     () =>
  //       useBalance({
  //         provider,
  //         walletAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239'
  //       }),
  //     { wrapper: Container }
  //   )
  // })

  // it('setter update ERC20 balance', async () => {
  //   const provider = new StaticJsonRpcProvider(
  //     process.env.REACT_APP_ETHEREUM_RPC_URL,
  //     1
  //   )
  //   jest
  //     .spyOn(MultiCaller.prototype, 'getTokenData')
  //     .mockImplementationOnce(() => Promise.resolve(BigNumber.from(30)))
  //     .mockImplementationOnce(() => Promise.resolve(BigNumber.from(40)))

  //   const { result, waitForNextUpdate } = await renderHook(
  //     () =>
  //       useBalance({
  //         provider,
  //         walletAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239'
  //       }),
  //     { wrapper: Container }
  //   )
  // })

  // it('setter update ERC20 balance without erasing previous data', async () => {
  //   const provider = new StaticJsonRpcProvider(
  //     process.env.REACT_APP_ETHEREUM_RPC_URL,
  //     1
  //   )
  //   jest
  //     .spyOn(MultiCaller.prototype, 'getTokenData')
  //     .mockImplementationOnce(() => Promise.resolve(BigNumber.from(30)))
  //     .mockImplementationOnce(() => Promise.resolve(BigNumber.from(40)))

  //   const { result, waitForNextUpdate } = await renderHook(
  //     () =>
  //       useBalance({
  //         provider,
  //         walletAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239'
  //       }),
  //     { wrapper: Container }
  //   )
  // })
})
