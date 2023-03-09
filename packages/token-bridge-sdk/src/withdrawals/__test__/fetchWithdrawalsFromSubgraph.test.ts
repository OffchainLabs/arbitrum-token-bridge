// Covers both ETH and Token withdrawals from subgraph

import {
  getQueryCoveringClassicOnlyWithoutResults,
  getQueryCoveringClassicOnlyWithResults,
  getQueryCoveringClassicAndNitroWithResults
} from './fetchWithdrawalsTestHelpers'
import { fetchWithdrawalsFromSubgraph } from '../fetchWithdrawalsFromSubgraph'

describe('fetchTokenWithdrawalsFromSubgraph', () => {
  it('fetches no withdrawals from subgraph pre-nitro', async () => {
    const result = await fetchWithdrawalsFromSubgraph(
      getQueryCoveringClassicOnlyWithoutResults()
    )

    expect(result).toHaveLength(0)
  })

  it('fetches some withdrawals from subgraph pre-nitro', async () => {
    const result = await fetchWithdrawalsFromSubgraph(
      getQueryCoveringClassicOnlyWithResults()
    )

    expect(result).toHaveLength(2)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          l2TxHash:
            '0x4142fe27aa74108010135eac0c2d10bc518a1c683d7f7d3f90fa00fe383bcb25'
        }),
        expect.objectContaining({
          l2TxHash:
            '0x98c3c3bf97f177e80ac5a5adb154208e5ad43120455e624fff917a7546273800'
        })
      ])
    )
  })

  it('fetches some withdrawals from subgraph pre-nitro and post-nitro', async () => {
    const result = await fetchWithdrawalsFromSubgraph(
      getQueryCoveringClassicAndNitroWithResults()
    )

    expect(result).toHaveLength(4)
    expect(result).toEqual(
      expect.arrayContaining([
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
      ])
    )
  })
})
