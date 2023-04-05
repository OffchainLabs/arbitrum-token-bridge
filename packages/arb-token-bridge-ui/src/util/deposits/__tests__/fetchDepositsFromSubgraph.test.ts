import {
  getQueryCoveringClassicOnlyWithoutResults,
  getQueryCoveringClassicOnlyWithResults,
  getQueryCoveringClassicAndNitroWithResults
} from './fetchDepositsTestHelpers'
import { fetchDepositsFromSubgraph } from '../fetchDepositsFromSubgraph'

describe('fetchDepositsFromSubgraph', () => {
  it('fetches no deposits from subgraph pre-nitro', async () => {
    const result = await fetchDepositsFromSubgraph(
      getQueryCoveringClassicOnlyWithoutResults()
    )

    expect(result).toHaveLength(0)
  })

  it('fetches some deposits from subgraph pre-nitro', async () => {
    const result = await fetchDepositsFromSubgraph(
      getQueryCoveringClassicOnlyWithResults()
    )

    expect(result).toHaveLength(3)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionHash:
            '0xea5d4882507685e1adea9793cb1139f42d0cc37875baa867e3412325dbbaa34a'
        }),
        expect.objectContaining({
          transactionHash:
            '0x86b6bdf5d840f5f8212f7b521c902d1b88795383ee86a474c305983c8d931e37'
        }),
        expect.objectContaining({
          transactionHash:
            '0x1b62ab0821e6e68d959b764742079942de617fa032551e7b08b34fef16ffbe39'
        })
      ])
    )
  })

  it('fetches some deposits from subgraph pre-nitro and post-nitro', async () => {
    const result = await fetchDepositsFromSubgraph(
      getQueryCoveringClassicAndNitroWithResults()
    )

    expect(result).toHaveLength(4)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionHash:
            '0x92402a70f22d50c6f887db1fae9aa688bc4169d4064a43b79d5b0e238141f236'
        }),
        expect.objectContaining({
          transactionHash:
            '0xceca4bf43ba5939e9c80933d5dbc6f083f2a40883fbe34f6e6e861b593526893'
        }),
        expect.objectContaining({
          transactionHash:
            '0x9bb0e25cb7bfab636e2282c4d9f350fc6b2ec6a7ab31809132df20296c6bc152'
        }),
        expect.objectContaining({
          transactionHash:
            '0xa6b356dcddf1cf45bc0631e606bf9d9ba04b38d60bac98a78c5e64f679d94efe'
        })
      ])
    )
  })
})
