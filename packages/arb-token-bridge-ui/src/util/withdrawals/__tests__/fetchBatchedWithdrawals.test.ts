import { vi, describe, it, expect } from 'vitest'
import { fetchBatchedWithdrawals } from '../../../hooks/useTransactionHistory'
import { getQueryCoveringClassicAndNitroWithResults } from './fetchWithdrawalsTestHelpers'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import * as fetchModule from '../fetchWithdrawals'

const validResult = [
  expect.objectContaining({
    l2TxHash:
      '0x42d860059e8f9ec897348590fc34ad48ca0daba965071a6348f2ddc9dd2132d3'
  }),
  expect.objectContaining({
    l2TxHash:
      '0x7eba6d30f86f39917959c55604f661f429142139473e9eaec332d65c507cb215'
  }),
  expect.objectContaining({
    l2TxHash:
      '0xcf38b3fe57a4d823d0dd4b4ba3792f51640a4575f7da8fb582e5006bf60bceb3'
  }),
  expect.objectContaining({
    l2TxHash:
      '0xbd809fa3ad466a5a88628f3f0f9fc92df4ab9d9b1bd6b3861cd87cb464a9a7c3'
  })
]

const l1Provider = new StaticJsonRpcProvider('https://eth.llamarpc.com')

describe.sequential('fetchBatchedWithdrawals multiple calls', () => {
  it('calls fetchWithdrawals correct number of times and returns valid data', async () => {
    const mock = vi.spyOn(fetchModule, 'fetchWithdrawals')

    const result = await fetchBatchedWithdrawals({
      l1Provider,
      ...getQueryCoveringClassicAndNitroWithResults(),
      batchSizeBlocks: 5_000_000
    })

    expect(mock).toHaveBeenCalledTimes(3)
    expect(result).toHaveLength(4)
    expect(result).toEqual(expect.arrayContaining(validResult))

    mock.mockRestore()
  })
})

describe.sequential('fetchBatchedWithdrawals single call', () => {
  it('calls a large range once and returns valid data', async () => {
    const mock = vi.spyOn(fetchModule, 'fetchWithdrawals')

    const result = await fetchBatchedWithdrawals({
      l1Provider,
      ...getQueryCoveringClassicAndNitroWithResults(),
      batchSizeBlocks: 100_000_000
    })

    expect(mock).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(4)
    expect(result).toEqual(expect.arrayContaining(validResult))
  })
})

describe.sequential(
  'fetchBatchedWithdrawals throw error when toBlock lower than fromBlock',
  () => {
    it('throws an error', async () => {
      await expect(
        fetchBatchedWithdrawals({
          l1Provider,
          ...getQueryCoveringClassicAndNitroWithResults(),
          batchSizeBlocks: 1,
          fromBlock: 2,
          toBlock: 1
        })
      ).rejects.toThrow('toBlock (1) cannot be lower than fromBlock (2)')
    })
  }
)
