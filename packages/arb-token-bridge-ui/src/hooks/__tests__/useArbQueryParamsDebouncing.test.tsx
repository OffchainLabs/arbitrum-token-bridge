import React from 'react'
import { vi, beforeEach, describe, it, expect, afterEach } from 'vitest'
import { ChainId } from '../../types/ChainId'
import { PropsWithChildren } from 'react'
import { act, renderHook } from '@testing-library/react'
import { useArbQueryParams } from '../useArbQueryParams'

const mockSetQueryParams = vi.fn()
let currentQueryParams = {
  amount: '',
  amount2: '',
  sourceChain: ChainId.Ethereum,
  destinationChain: ChainId.ArbitrumOne,
  token: null
}

vi.mock('use-query-params', () => ({
  useQueryParams: () => {
    return [currentQueryParams, mockSetQueryParams]
  },
  QueryParamProvider: ({ children }: PropsWithChildren) => children,
  BooleanParam: { encode: vi.fn(), decode: vi.fn() },
  StringParam: { encode: vi.fn(), decode: vi.fn() },
  withDefault: vi.fn()
}))

const TestWrapper = ({ children }: PropsWithChildren) => <>{children}</>

describe.sequential('useArbQueryParams debouncing', () => {
  beforeEach(() => {
    vi.useFakeTimers()

    currentQueryParams = {
      amount: '',
      amount2: '',
      sourceChain: ChainId.Ethereum,
      destinationChain: ChainId.ArbitrumOne,
      token: null
    }

    mockSetQueryParams.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should be batched with debounce: true', async () => {
    const { result } = renderHook(() => useArbQueryParams(), {
      wrapper: TestWrapper
    })

    await act(async () => {
      const [, setQueryParams] = result.current
      setQueryParams({ amount: '10.5' }, { debounce: true })
      setQueryParams({ sourceChain: ChainId.ArbitrumOne }, { debounce: true })
      setQueryParams({ destinationChain: ChainId.Ethereum }, { debounce: true })
      setQueryParams(
        { token: '0xaf88d065e77c8cc2239327c5edb3a432268e5831' },
        { debounce: true }
      )
      vi.runOnlyPendingTimers()
    })

    expect(mockSetQueryParams).toHaveBeenCalledExactlyOnceWith({
      amount: '10.5',
      sourceChain: ChainId.ArbitrumOne,
      sanitized: 'true',
      destinationChain: ChainId.Ethereum,
      token: '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
    })
  })

  it('should flush pending updates when receiving a call with debounce: false', async () => {
    const { result } = renderHook(() => useArbQueryParams(), {
      wrapper: TestWrapper
    })

    await act(async () => {
      const [, setQueryParams] = result.current
      setQueryParams({ amount: '10.5' }, { debounce: true })
      setQueryParams({ sourceChain: ChainId.ArbitrumOne }, { debounce: true })
      setQueryParams(
        { destinationChain: ChainId.Ethereum },
        { debounce: false }
      )
      setQueryParams(
        { token: '0xaf88d065e77c8cc2239327c5edb3a432268e5831' },
        { debounce: true }
      )
      vi.runOnlyPendingTimers()
    })

    expect(mockSetQueryParams).toHaveBeenCalledTimes(2)
    // The first 2 debounced updates are merged with the first non-debounced update
    expect(mockSetQueryParams).toHaveBeenNthCalledWith(1, {
      amount: '10.5',
      sourceChain: ChainId.ArbitrumOne,
      destinationChain: ChainId.Ethereum
    })

    expect(mockSetQueryParams).toHaveBeenNthCalledWith(2, {
      token: '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
    })
  })

  it('should not be batched with debounce: false', async () => {
    const { result } = renderHook(() => useArbQueryParams(), {
      wrapper: TestWrapper
    })

    await act(async () => {
      const [, setQueryParams] = result.current
      setQueryParams({ amount: '10.5' })
      setQueryParams({ sourceChain: ChainId.ArbitrumOne })
      setQueryParams({ destinationChain: ChainId.Ethereum })
      setQueryParams({ token: '0xaf88d065e77c8cc2239327c5edb3a432268e5831' })
      vi.runOnlyPendingTimers()
    })

    expect(mockSetQueryParams).toHaveBeenCalledTimes(4)
    expect(mockSetQueryParams).toHaveBeenNthCalledWith(1, {
      amount: '10.5'
    })
    expect(mockSetQueryParams).toHaveBeenNthCalledWith(2, {
      sourceChain: ChainId.ArbitrumOne
    })
    expect(mockSetQueryParams).toHaveBeenNthCalledWith(3, {
      destinationChain: ChainId.Ethereum
    })
    expect(mockSetQueryParams).toHaveBeenNthCalledWith(4, {
      token: '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
    })
  })

  it('should handle mixed object and function updates correctly', async () => {
    const { result } = renderHook(() => useArbQueryParams(), {
      wrapper: TestWrapper
    })

    await act(async () => {
      const [, setQueryParams] = result.current
      setQueryParams({ amount: '100' }, { debounce: true })
      setQueryParams({ sourceChain: ChainId.Base }, { debounce: true })
      setQueryParams(
        { destinationChain: ChainId.ArbitrumOne },
        { debounce: true }
      )
      setQueryParams(
        { token: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' },
        { debounce: true }
      )
      setQueryParams(prevState => ({
        ...prevState,
        amount: (Number(prevState.amount) * 2).toString(), // 200
        amount2: '300'
      }))
      setQueryParams(prevState => ({
        ...prevState,
        amount2: (Number(prevState.amount2) * 3).toString() // 900
      }))
      vi.runOnlyPendingTimers()
    })

    expect(mockSetQueryParams).toHaveBeenCalledTimes(2)
    expect(mockSetQueryParams).toHaveBeenCalledWith(expect.any(Function))

    const setQueryParams = mockSetQueryParams.mock.calls[0]?.[0]
    const secondSetQueryParams = mockSetQueryParams.mock.calls[1]?.[0]

    const expectedInputs = {
      ...currentQueryParams,
      amount: '100',
      sourceChain: ChainId.Base,
      destinationChain: ChainId.ArbitrumOne,
      token: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
    }

    const setQueryParamsResult = setQueryParams(expectedInputs)
    expect(setQueryParamsResult).toEqual({
      ...expectedInputs,
      amount: '200', // 100 * 2
      amount2: '300'
    })

    const secondSetQueryParamsResult =
      secondSetQueryParams(setQueryParamsResult)
    expect(secondSetQueryParamsResult).toEqual({
      ...setQueryParamsResult,
      amount: '200',
      amount2: '900'
    })
  })
})
