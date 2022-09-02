import { JsonRpcProvider } from '@ethersproject/providers'

import { fetchETHWithdrawalsFromEventLogs } from '../fetchETHWithdrawals'

const l2Provider = new JsonRpcProvider('https://rinkeby.arbitrum.io/rpc')

function tx(txHash: string) {
  return { transactionHash: txHash }
}

describe('fetchETHWithdrawalsFromEventLogs', () => {
  it('correctly fetches no ETH withdrawals from event logs', async () => {
    const result = await fetchETHWithdrawalsFromEventLogs({
      address: '0x41C966f99De0cA6F6531fbcAc9Db7eaBDF119744',
      fromBlock: 0,
      toBlock: 11110000,
      l2Provider
    })

    expect(result.length).toEqual(0)
  })

  it('correctly fetches some ETH withdrawals from event logs', async () => {
    const result = await fetchETHWithdrawalsFromEventLogs({
      address: '0x41C966f99De0cA6F6531fbcAc9Db7eaBDF119744',
      fromBlock: 11110000,
      toBlock: 12055296,
      l2Provider
    })

    expect(result.length).toEqual(5)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining(
          tx(
            '0xdc8f593a5c19f2133e59c6e332dee0f330d977ffa11387eee2cfc55cee1722e7'
          )
        ),
        expect.objectContaining(
          tx(
            '0xb482555a63edc154035834a7380ae3787c0126730228d4e1dce97520f25ed0f7'
          )
        ),
        expect.objectContaining(
          tx(
            '0xa639f70688a095ce3134c4768de5ef0e2fbad804ca4bdee8dc56131b4500bcb9'
          )
        ),
        expect.objectContaining(
          tx(
            '0xc3636c940f800ccc14e83a35448cc62ab9c5bd9bcdb25cc451769df9bd0260e0'
          )
        ),
        expect.objectContaining(
          tx(
            '0x821b91067d86d4081639183e29d00f1e553370f979514337f1aa2b867250a269'
          )
        )
      ])
    )
  })
})
