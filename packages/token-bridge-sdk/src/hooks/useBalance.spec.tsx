/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react-hooks'
import { useBalance } from './useBalance'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { SWRConfig } from 'swr'
import { PropsWithChildren } from 'react'

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

    const { result, waitForNextUpdate } = await renderHook(() =>
      useBalance({
        provider,
        walletAddress: undefined
      })
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
    jest.spyOn(provider, 'getNetwork').mockImplementation(() => {
      return null
    })

    const { result, waitForNextUpdate } = await renderHook(() =>
      useBalance({
        provider,
        walletAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239'
      })
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

  it('getter return balance for valid tuple (walletAddress, chainId)', async () => {
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

    try {
      await waitForNextUpdate({ timeout: 100 })
    } catch (err) {}

    const {
      current: {
        eth: [ethBalance]
      }
    } = result

    expect(ethBalance?.toNumber()).toEqual(10)
  })

  it('setter update balance ', async () => {
    const provider = new StaticJsonRpcProvider(
      process.env.REACT_APP_ETHEREUM_RPC_URL,
      1
    )
    jest.spyOn(provider, 'getBalance').mockImplementation(() => {
      return Promise.resolve(BigNumber.from(30))
    })

    const { result, waitForNextUpdate } = await renderHook(() =>
      useBalance({
        provider,
        walletAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239'
      })
    )

    try {
      await waitForNextUpdate({ timeout: 100 })
    } catch (err) {}

    const {
      current: {
        eth: [ethBalance, updateEthBalance]
      }
    } = result

    expect(ethBalance?.toNumber()).toEqual(30)

    await act(async () => {
      await updateEthBalance()

      try {
        await waitForNextUpdate({ timeout: 500 })
        expect(ethBalance?.toNumber()).toEqual(40)
      } catch (error) {}
    })
  })
})
