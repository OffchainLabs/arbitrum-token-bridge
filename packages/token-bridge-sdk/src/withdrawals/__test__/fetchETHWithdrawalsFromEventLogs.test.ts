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

    expect(result).toHaveLength(3)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionHash:
            '0x7378773d1af4cfbbc91179efdaf63872f8e1cb7f84e9a9511ef3f1ce6dbcb671'
        }),
        expect.objectContaining({
          transactionHash:
            '0xf9e53f80b90b95b940573d1a2b76d2fe240a4fe6e96272771553400d4cb17fd0'
        }),
        expect.objectContaining({
          transactionHash:
            '0x021973feaad7c7813ac06a4d4cfac32455fbdf9e13cf427edcebd1bf4e5f12cf'
        })
      ])
    )
  })
})
