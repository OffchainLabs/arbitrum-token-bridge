import { describe, expect, it } from 'vitest'

import { fetchEthDepositsToCustomDestinationFromSubgraph } from '../fetchEthDepositsToCustomDestinationFromSubgraph'
import {
  getQueryCoveringNitroWithoutResults,
  getQueryCoveringNitroWithResults
} from './fetchEthDepositsToCustomDestinationTestHelpers'

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

    expect(result).toHaveLength(1)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionHash:
            '0x309c2f9778797445dc3b9da63be5569bb33edf88222775060532bc85edce1897'
        })
      ])
    )
  })
})
