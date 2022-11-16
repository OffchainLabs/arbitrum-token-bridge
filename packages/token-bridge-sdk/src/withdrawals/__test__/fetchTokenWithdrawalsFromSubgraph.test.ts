import {
  getQueryCoveringClassicOnlyWithoutResults,
  getQueryCoveringClassicOnlyWithResults,
  getQueryCoveringClassicAndNitroWithResults
} from './fetchTokenWithdrawalsTestHelpers'
import { fetchTokenWithdrawalsFromSubgraph } from '../fetchTokenWithdrawalsFromSubgraph'

describe('fetchTokenWithdrawalsFromSubgraph', () => {
  it('fetches no token withdrawals from subgraph pre-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromSubgraph(
      getQueryCoveringClassicOnlyWithoutResults()
    )

    expect(result).toHaveLength(0)
  })

  it('fetches some token withdrawals from subgraph pre-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromSubgraph(
      getQueryCoveringClassicOnlyWithResults()
    )

    expect(result).toHaveLength(1)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          l2TxHash:
            '0x98c3c3bf97f177e80ac5a5adb154208e5ad43120455e624fff917a7546273800'
        })
      ])
    )
  })

  it('fetches some token withdrawals from subgraph pre-nitro and post-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromSubgraph(
      getQueryCoveringClassicAndNitroWithResults()
    )

    expect(result).toHaveLength(5)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          l2TxHash:
            '0x98c3c3bf97f177e80ac5a5adb154208e5ad43120455e624fff917a7546273800'
        }),
        expect.objectContaining({
          l2TxHash:
            '0xcf38b3fe57a4d823d0dd4b4ba3792f51640a4575f7da8fb582e5006bf60bceb3'
        }),
        expect.objectContaining({
          l2TxHash:
            '0xbd809fa3ad466a5a88628f3f0f9fc92df4ab9d9b1bd6b3861cd87cb464a9a7c3'
        }),
        expect.objectContaining({
          l2TxHash:
            '0xbe4141f4b6847ef1f3196734beefa1ac08149abc8beba2d8d71055995cd3c29b'
        }),
        expect.objectContaining({
          l2TxHash:
            '0x420eadd347bda4bfe5d44a96e0ae68347cb181ee7a910198582e9535665cdb38'
        })
      ])
    )
  })
})
