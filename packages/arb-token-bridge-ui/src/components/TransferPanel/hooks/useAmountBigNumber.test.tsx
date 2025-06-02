import { act, renderHook } from '@testing-library/react'
import React, { PropsWithChildren } from 'react'
import {
  EncodedQuery,
  QueryParamAdapter,
  QueryParamOptions,
  QueryParamProvider
} from 'use-query-params'
import { expect, it, vi } from 'vitest'

import { makeMockAdapter } from '../../../hooks/__tests__/helpers'
import { useAmountBigNumber } from './useAmountBigNumber'

const mocks = vi.hoisted(() => {
  return {
    useSelectedTokenDecimals: vi.fn()
  }
})

vi.mock('../../../hooks/TransferPanel/useSelectedTokenDecimals', () => {
  return {
    useSelectedTokenDecimals: mocks.useSelectedTokenDecimals
  }
})

export function setupWrapper(query: EncodedQuery, options?: QueryParamOptions) {
  const Adapter = makeMockAdapter({
    search: new URLSearchParams(query as Record<string, string>).toString()
  })

  const adapter = Adapter.adapter as QueryParamAdapter
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryParamProvider adapter={Adapter} options={options}>
      {children}
    </QueryParamProvider>
  )

  return { wrapper, adapter }
}

it('Does not do anything if selectedToken has more decimals than the amount', () => {
  mocks.useSelectedTokenDecimals.mockReturnValue(18)
  const { wrapper } = setupWrapper({ amount: '1.23456789' })
  const { result } = renderHook(() => useAmountBigNumber(), { wrapper })
  expect(result.current.toString()).toEqual('1234567890000000000')
})

it('Truncate if selectedToken has less decimals than the amount', () => {
  mocks.useSelectedTokenDecimals.mockReturnValue(6)
  const { wrapper } = setupWrapper({ amount: '1.123456789' })
  const { result } = renderHook(() => useAmountBigNumber(), { wrapper })
  expect(result.current.toString()).toEqual('1123456')
})

it('Does not truncate if amount has more digits than number of decimals', () => {
  mocks.useSelectedTokenDecimals.mockReturnValue(6)
  const { wrapper } = setupWrapper({ amount: '123456789' })
  const { result } = renderHook(() => useAmountBigNumber(), { wrapper })
  expect(result.current.toString()).toEqual('123456789000000')
})

it('Update amount if selectedToken changes', async () => {
  mocks.useSelectedTokenDecimals.mockReturnValue(18)
  const { wrapper, adapter } = setupWrapper({ amount: '1.23456789' })
  const { result, rerender } = renderHook(() => useAmountBigNumber(), {
    wrapper
  })
  expect(result.current.toString()).toEqual('1234567890000000000')

  mocks.useSelectedTokenDecimals.mockReturnValue(6)

  await act(async () => {
    rerender()
  })

  expect(adapter.push).toHaveBeenCalledExactlyOnceWith({
    search: '?amount=1.234567'
  })
  expect(result.current.toString()).toEqual('1234567')
})
