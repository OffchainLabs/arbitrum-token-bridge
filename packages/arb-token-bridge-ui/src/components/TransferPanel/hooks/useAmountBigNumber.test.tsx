import { act, renderHook } from '@testing-library/react'
import { vi, it, expect } from 'vitest'
import { useAmountBigNumber } from './useAmountBigNumber'
import {
  DecodedValueMap,
  QueryParamAdapter,
  QueryParamConfigMap,
  QueryParamProvider
} from 'use-query-params'
import React, { PropsWithChildren } from 'react'
import { makeMockAdapter } from '../../../hooks/__tests__/helpers'
import {
  queryParamProviderOptions,
  SetQueryParamsParameters
} from '../../../hooks/useArbQueryParams'

const mocks = vi.hoisted(() => {
  return {
    useSelectedTokenDecimals: vi.fn(),
    mockSetQueryParams: vi.fn(),
    mockQueryParams: {} as Partial<DecodedValueMap<QueryParamConfigMap>>
  }
})

vi.mock('../../../hooks/TransferPanel/useSelectedTokenDecimals', () => {
  return {
    useSelectedTokenDecimals: mocks.useSelectedTokenDecimals
  }
})

vi.mock('use-query-params', async () => {
  const actual = await vi.importActual('use-query-params')
  return {
    ...actual,
    useQueryParams: vi.fn(() => [
      mocks.mockQueryParams,
      mocks.mockSetQueryParams
    ])
  }
})

export function setupWrapper(
  query: Partial<DecodedValueMap<QueryParamConfigMap>>
) {
  mocks.mockQueryParams = Object.fromEntries(
    new URLSearchParams(query as Record<string, string>)
  )

  const Adapter = makeMockAdapter({
    search: new URLSearchParams(query as Record<string, string>).toString()
  })

  const adapter = Adapter.adapter as QueryParamAdapter

  mocks.mockSetQueryParams.mockImplementation(
    (updates: SetQueryParamsParameters) => {
      const searchParams = new URLSearchParams()
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value))
        }
      })
      adapter.push({ search: `?${searchParams.toString()}` })
    }
  )

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryParamProvider adapter={Adapter} options={queryParamProviderOptions}>
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
  vi.useFakeTimers()
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

  await act(async () => {
    vi.runOnlyPendingTimers()
  })

  expect(adapter.push).toHaveBeenCalledExactlyOnceWith({
    search: '?sanitized=true&amount=1.234567'
  })
  expect(result.current.toString()).toEqual('1234567')

  vi.useRealTimers()
})
