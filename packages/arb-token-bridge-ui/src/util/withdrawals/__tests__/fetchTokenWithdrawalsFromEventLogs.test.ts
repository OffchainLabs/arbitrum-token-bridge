import { fetchTokenWithdrawalsFromEventLogs } from '../fetchTokenWithdrawalsFromEventLogs'
import {
  getQueryCoveringClassicOnlyWithoutResults,
  getQueryCoveringClassicOnlyWithResults,
  getQueryCoveringClassicAndNitroWithResults
} from './fetchWithdrawalsTestHelpers'

describe('fetchTokenWithdrawalsFromEventLogs', () => {
  it('fetches no token withdrawals from event logs pre-nitro', async () => {
    // TODO: This is a temporary fix, when Event Logs are enabled for custom address
    // we will be able to use the same properties, and remove the need to assign sender to address
    const query = getQueryCoveringClassicOnlyWithoutResults()
    const fromAddress = query.sender
    const result = await fetchTokenWithdrawalsFromEventLogs({
      ...query,
      fromAddress
    })

    expect(result).toHaveLength(0)
  })

  it('fetches some token withdrawals from event logs pre-nitro', async () => {
    const query = getQueryCoveringClassicOnlyWithResults()
    const fromAddress = query.sender
    const result = await fetchTokenWithdrawalsFromEventLogs({
      ...query,
      fromAddress
    })

    expect(result).toHaveLength(1)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          txHash:
            '0x98c3c3bf97f177e80ac5a5adb154208e5ad43120455e624fff917a7546273800'
        })
      ])
    )
  })

  it('fetches some token withdrawals from event logs pre-nitro and post-nitro', async () => {
    const query = getQueryCoveringClassicAndNitroWithResults()
    const fromAddress = query.sender
    const result = await fetchTokenWithdrawalsFromEventLogs({
      ...query,
      fromAddress
    })

    expect(result).toHaveLength(1)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          txHash:
            '0xbd809fa3ad466a5a88628f3f0f9fc92df4ab9d9b1bd6b3861cd87cb464a9a7c3'
        })
      ])
    )
  })
})
