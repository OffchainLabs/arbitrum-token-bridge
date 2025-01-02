import { fetchTokenDepositsFromEventLogs } from '../fetchTokenDepositsFromEventLogs'
import {
  getQueryCoveringClassicAndNitroWithResults,
  getQueryCoveringClassicOnlyWithoutResults,
  getQueryCoveringClassicOnlyWithResults
} from './fetchDepositsTestHelpers'

const TIMEOUT = 30_000

describe('fetchTokenDepositsFromEventLogs', () => {
  it(
    'fetches no token deposits from event logs pre-nitro',
    async () => {
      const result = await fetchTokenDepositsFromEventLogs(
        getQueryCoveringClassicOnlyWithoutResults()
      )

      expect(result).toHaveLength(0)
    },
    TIMEOUT
  )

  it(
    'fetches some token deposits from event logs pre-nitro',
    async () => {
      const result = await fetchTokenDepositsFromEventLogs({
        ...getQueryCoveringClassicOnlyWithResults(),
        sender: '0x981EA2202d2d33D26583E96f6e6449C1F9b6Bbb1'
      })

      expect(result).toHaveLength(1)
      expect(result).toEqual(
        expect.arrayContaining([
          // 14387620
          expect.objectContaining({
            txHash:
              '0xc112c54c261dabbd919132149226fc8a4c0196948e18dda947aa06e8b8b69064'
          })
        ])
      )
    },
    TIMEOUT
  )

  it(
    'fetches some token deposits from event logs pre-nitro and post-nitro',
    async () => {
      const result1 = await fetchTokenDepositsFromEventLogs({
        ...getQueryCoveringClassicAndNitroWithResults(),
        sender: '0x5049FEB67800e5BA82626c9f78FF9C458E0Eb66f'
      })

      expect(result1).toHaveLength(1)
      expect(result1).toEqual(
        expect.arrayContaining([
          // 15417417
          expect.objectContaining({
            txHash:
              '0xd9e72eba4548811425fd57def8aad238fcfdb0ced5a2af1d6b99f48ef51d52f0'
          })
        ])
      )

      const result2 = await fetchTokenDepositsFromEventLogs({
        ...getQueryCoveringClassicAndNitroWithResults(),
        sender: '0x8594D8e9483473626908648A5539D9d65Ca2fe8d'
      })

      expect(result2).toHaveLength(149)
    },
    TIMEOUT
  )
})

it(
  'fetches some token deposits from event logs post-nitro',
  async () => {
    const result = await fetchTokenDepositsFromEventLogs({
      ...getQueryCoveringClassicOnlyWithResults(),
      sender: '0x07aE8551Be970cB1cCa11Dd7a11F47Ae82e70E67',
      fromBlock: 21502346,
      toBlock: 21502471
    })

    expect(result).toHaveLength(2)
    expect(result).toEqual(
      expect.arrayContaining([
        // 14310032
        expect.objectContaining({
          txHash:
            '0x583bea616664fa32f68d25822bb64f18c8186221c35919a567b3de5eb9c1ae7e'
        }),
        // 14309826
        expect.objectContaining({
          txHash:
            '0x012ef30f19eb89951590790f6e2882fe6a5dc7671e8cbddb2b09b6efd7ad892a'
        })
      ])
    )
  },
  TIMEOUT
)
