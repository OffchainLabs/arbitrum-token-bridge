import {
  getQueryCoveringClassicOnlyWithoutResults,
  getQueryCoveringClassicOnlyWithResults,
  getQueryCoveringClassicAndNitroWithResults
} from './fetchETHWithdrawalsTestHelpers'
import { fetchETHWithdrawalsFromEventLogs } from '../fetchETHWithdrawalsFromEventLogs'

describe('fetchETHWithdrawalsFromEventLogs', () => {
  it('fetches no ETH withdrawals from event logs pre-nitro', async () => {
    const result = await fetchETHWithdrawalsFromEventLogs(
      getQueryCoveringClassicOnlyWithoutResults()
    )

    expect(result).toHaveLength(0)
  })

  it('fetches some ETH withdrawals from event logs pre-nitro', async () => {
    const result = await fetchETHWithdrawalsFromEventLogs(
      getQueryCoveringClassicOnlyWithResults()
    )

    expect(result).toHaveLength(1)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionHash:
            '0x7378773d1af4cfbbc91179efdaf63872f8e1cb7f84e9a9511ef3f1ce6dbcb671'
        })
      ])
    )
  })

  it('fetches some ETH withdrawals from event logs pre-nitro and post-nitro', async () => {
    const result = await fetchETHWithdrawalsFromEventLogs(
      getQueryCoveringClassicAndNitroWithResults()
    )

    expect(result).toHaveLength(1)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionHash:
            '0x7378773d1af4cfbbc91179efdaf63872f8e1cb7f84e9a9511ef3f1ce6dbcb671'
        })
      ])
    )
  })
})
