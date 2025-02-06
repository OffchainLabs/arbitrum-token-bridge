import { act, renderHook, RenderHookResult } from '@testing-library/react'
import { constants } from 'ethers'

import { useNetworks } from '../useNetworks'
import { useBalances } from '../useBalances'
import { useBalanceOnSourceChain } from '../useBalanceOnSourceChain'
import {
  useGasSummary,
  UseGasSummaryResult
} from '../TransferPanel/useGasSummary'
import { useGasEstimates } from '../TransferPanel/useGasEstimates'

jest.mock('../useNetworks', () => ({
  useNetworks: jest.fn()
}))

jest.mock('../useSelectedToken', () => ({
  useSelectedToken: jest.fn().mockReturnValue([
    {
      type: 'ERC20',
      decimals: 18,
      name: 'random',
      symbol: 'RAND',
      address: '0x123',
      l2Address: '0x234',
      listIds: new Set('1')
    },
    jest.fn()
  ])
}))

jest.mock('../useBalanceOnSourceChain', () => ({
  useBalanceOnSourceChain: jest.fn().mockReturnValue(constants.Zero)
}))

jest.mock('../useGasEstimates', () => ({
  useGasEstimates: jest.fn()
}))

const renderHookAsyncUseGasSummary = async () => {
  let hook: RenderHookResult<UseGasSummaryResult, undefined> | undefined

  await act(async () => {
    hook = renderHook(() => useGasSummary())
  })

  if (!hook) {
    throw new Error('Hook is not defined')
  }

  return { result: hook.result }
}

describe('useGasSummary', () => {
  it('should return loading status if balance is zero', async () => {
    const { result } = await renderHookAsyncUseGasSummary()
    expect(result.current.status).toEqual('loading')
  })
})
