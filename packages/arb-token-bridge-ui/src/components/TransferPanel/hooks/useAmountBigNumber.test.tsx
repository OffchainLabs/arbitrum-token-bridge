import { act, renderHook } from '@testing-library/react'
import { vi, it, expect } from 'vitest'
import { useAmountBigNumber } from './useAmountBigNumber'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'

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

it('Does not do anything if selectedToken has more decimals than the amount', () => {
  mocks.useSelectedTokenDecimals.mockReturnValue(18)
  const { result } = renderHook(() => useAmountBigNumber(), {
    wrapper: withNuqsTestingAdapter({ searchParams: { amount: '1.23456789' } })
  })
  expect(result.current.toString()).toEqual('1234567890000000000')
})

it('Truncate if selectedToken has less decimals than the amount', () => {
  mocks.useSelectedTokenDecimals.mockReturnValue(6)
  const { result } = renderHook(() => useAmountBigNumber(), {
    wrapper: withNuqsTestingAdapter({ searchParams: { amount: '1.123456789' } })
  })
  expect(result.current.toString()).toEqual('1123456')
})

it('Does not truncate if amount has more digits than number of decimals', () => {
  mocks.useSelectedTokenDecimals.mockReturnValue(6)
  const { result } = renderHook(() => useAmountBigNumber(), {
    wrapper: withNuqsTestingAdapter({ searchParams: { amount: '123456789' } })
  })
  expect(result.current.toString()).toEqual('123456789000000')
})

it('Update amount if selectedToken changes', async () => {
  mocks.useSelectedTokenDecimals.mockReturnValue(18)
  const onUrlUpdate = vi.fn()
  const { result } = renderHook(() => useAmountBigNumber(), {
    wrapper: withNuqsTestingAdapter({
      searchParams: { amount: '1.23456789' },
      onUrlUpdate
    })
  })
  expect(result.current.toString()).toEqual('1234567890000000000')

  const { result: arbQueryParams } = renderHook(() => useArbQueryParams(), {
    wrapper: withNuqsTestingAdapter()
  })

  mocks.useSelectedTokenDecimals.mockReturnValue(6)

  await act(async () => {
    arbQueryParams.current[1]({
      token: '0x1234567890123456789012345678901234567890'
    })
  })

  expect(result.current.toString()).toEqual('1234567')
})
