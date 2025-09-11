import {
  getQueryCoveringNitroWithResults,
  getQueryCoveringNitroWithoutResults
} from './fetchEthDepositsToCustomDestinationTestHelpers'
import { fetchEthDepositsToCustomDestinationFromSubgraph } from '../fetchEthDepositsToCustomDestinationFromSubgraph'
import { describe, it, expect } from 'vitest'

describe('fetchEthDepositsToCustomDestinationFromSubgraph', () => {
  it('fetches deposits from subgraph with zero results', async () => {
    const result = await fetchEthDepositsToCustomDestinationFromSubgraph(
      getQueryCoveringNitroWithoutResults()
    )

    expect(result).toHaveLength(0)
  })

  it('fetches deposits from subgraph', async () => {
    const result = await fetchEthDepositsToCustomDestinationFromSubgraph(
      getQueryCoveringNitroWithResults()
    )

    expect(result).toHaveLength(2)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionHash:
            '0x49db903399a3b4caa9d99bbac4ca704bd4bad3d247c2d26ccdd0296c96ebf7dd'
        }),
        expect.objectContaining({
          transactionHash:
            '0x6429e7cb8fa7f501d336ec0672755404c9021abe5d19ae07ad875ad2f1ae6537'
        })
      ])
    )
  })
})
