// Covers both ETH and Token withdrawals from subgraph
import { fetchWithdrawalsFromSubgraph } from '../fetchWithdrawalsFromSubgraph'
import { getQueryForBlock } from './fetchWithdrawalsTestHelpers'

describe('fetchTokenWithdrawalsFromSubgraph', () => {
  it('fetches no withdrawals from subgraph pre-nitro', async () => {
    const result = await fetchWithdrawalsFromSubgraph(
      getQueryForBlock(19416905)
    )

    expect(result).toHaveLength(0)
  })

  it('fetches some withdrawals from subgraph pre-nitro', async () => {
    const result = await fetchWithdrawalsFromSubgraph(
      getQueryForBlock(20961064)
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

  it('fetches some withdrawals from subgraph pre-nitro and post-nitro', async () => {
    const result = await fetchWithdrawalsFromSubgraph(
      getQueryForBlock(31946015)
    )

    expect(result).toHaveLength(1)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          l2TxHash:
            '0xbd809fa3ad466a5a88628f3f0f9fc92df4ab9d9b1bd6b3861cd87cb464a9a7c3'
        })
      ])
    )
  })
})
