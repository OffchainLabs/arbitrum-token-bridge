/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react-hooks'
import { useBalance } from './useBalance'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'

const setup = async ({
  provider,
  walletAddress
}: {
  provider: StaticJsonRpcProvider
  walletAddress: string | undefined
}) => {
  const { result, waitForNextUpdate } = await renderHook(() =>
    useBalance({
      provider,
      walletAddress
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

  return [ethBalance, updateEthBalance] as const
}

describe('useBalance', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('getter return null for undefined walletAddress', async () => {
    const provider = new StaticJsonRpcProvider(
      process.env.REACT_APP_ETHEREUM_RPC_URL,
      1
    )

    const spy = jest.spyOn(provider, 'getBalance')
    const [ethBalance] = await setup({
      provider,
      walletAddress: undefined
    })

    expect(spy).toHaveBeenCalledTimes(0)
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

    const [ethBalance] = await setup({
      provider,
      walletAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239'
    })

    expect(ethBalance).toBeNull()
  })

  it('getter return balance for valid tuple (walletAddress, chainId)', async () => {
    const provider = new StaticJsonRpcProvider(
      process.env.REACT_APP_ETHEREUM_RPC_URL,
      1
    )

    const spy = jest.spyOn(provider, 'getBalance').mockImplementation(() => {
      return Promise.resolve(BigNumber.from(10))
    })

    const [ethBalance] = await setup({
      provider,
      walletAddress: '0x58b6A8A3302369DAEc383334672404Ee733aB239'
    })

    expect(ethBalance?.toNumber()).toEqual(10)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('setter update balance ', async () => {
    // const provider = new StaticJsonRpcProvider(
    //   process.env.REACT_APP_ETHEREUM_RPC_URL,
    //   1
    // )
    // const spy = jest.spyOn(provider, 'getBalance')
    // const [ethBalance] = await setup({
    //   provider,
    //   walletAddress: undefined
    // })
    // expect(spy).toHaveBeenCalledTimes(0)
    // expect(ethBalance).toBeNull()
    // expect(ethBalance?.toNumber()).toBe(0)
  })
})
