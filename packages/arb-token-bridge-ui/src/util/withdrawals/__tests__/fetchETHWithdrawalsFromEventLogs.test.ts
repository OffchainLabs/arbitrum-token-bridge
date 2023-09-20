import { getQueryForBlock } from './fetchETHWithdrawalsTestHelpers'
import { fetchETHWithdrawalsFromEventLogs } from '../fetchETHWithdrawalsFromEventLogs'

describe('fetchETHWithdrawalsFromEventLogs', () => {
  it('fetches no ETH withdrawals from event logs pre-nitro', async () => {
    const result = await fetchETHWithdrawalsFromEventLogs(
      getQueryForBlock(20785774)
    )

    expect(result).toHaveLength(0)
  })

  it('fetches some ETH withdrawals from event logs pre-nitro', async () => {
    const result = await fetchETHWithdrawalsFromEventLogs(
      getQueryForBlock(20785772)
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

  it('fetches some ETH withdrawals from event logs post-nitro', async () => {
    const result = await fetchETHWithdrawalsFromEventLogs(
      getQueryForBlock(24905369)
    )

    expect(result).toHaveLength(1)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionHash:
            '0xf9e53f80b90b95b940573d1a2b76d2fe240a4fe6e96272771553400d4cb17fd0'
        })
      ])
    )
  })
})
