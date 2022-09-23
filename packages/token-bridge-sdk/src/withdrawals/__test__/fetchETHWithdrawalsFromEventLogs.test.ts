import { JsonRpcProvider } from '@ethersproject/providers'

import { fetchETHWithdrawalsFromEventLogs } from '../fetchETHWithdrawalsFromEventLogs'

const l2Provider = new JsonRpcProvider('https://rinkeby.arbitrum.io/rpc')

describe('fetchETHWithdrawalsFromEventLogs', () => {
  it('fetches some ETH withdrawals from event logs', async () => {
    const result = await fetchETHWithdrawalsFromEventLogs({
      address: '0x41C966f99De0cA6F6531fbcAc9Db7eaBDF119744',
      fromBlock: 13744993,
      toBlock: 13956985,
      l2Provider
    })

    expect(result).toHaveLength(3)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionHash:
            '0xa0f9390177977fc0abf839c36808e853e1213e7583b48d2d48341fa41d054732'
        }),
        expect.objectContaining({
          transactionHash:
            '0xbeba9bc68ad640f6b946d3cd157dd51b3f272072c6a31234e5706e00c1bdb40b'
        }),
        expect.objectContaining({
          transactionHash:
            '0x050fed85e2b48d4937663a9597d60a97929150072e3e9403b1f07dbdf080a9af'
        })
      ])
    )
  })
})
