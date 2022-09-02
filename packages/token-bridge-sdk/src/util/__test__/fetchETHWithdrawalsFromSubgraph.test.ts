import 'cross-fetch/polyfill'

import { fetchETHWithdrawalsFromSubgraph } from '../fetchETHWithdrawalsFromSubgraph'

describe('fetchETHWithdrawalsFromSubgraph', () => {
  it('fetches no ETH withdrawals from subgraph pre-nitro', async () => {
    const result = await fetchETHWithdrawalsFromSubgraph({
      address: '0x41C966f99De0cA6F6531fbcAc9Db7eaBDF119744',
      fromBlock: 0,
      toBlock: 11110000,
      l1NetworkId: 4
    })

    expect(result).toHaveLength(0)
  })

  it('fetches some ETH withdrawals from subgraph pre-nitro', async () => {
    const result = await fetchETHWithdrawalsFromSubgraph({
      address: '0x41C966f99De0cA6F6531fbcAc9Db7eaBDF119744',
      fromBlock: 11110000,
      toBlock: 12055296,
      l1NetworkId: 4
    })

    expect(result).toHaveLength(5)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          l2TxHash:
            '0xdc8f593a5c19f2133e59c6e332dee0f330d977ffa11387eee2cfc55cee1722e7'
        }),
        expect.objectContaining({
          l2TxHash:
            '0xb482555a63edc154035834a7380ae3787c0126730228d4e1dce97520f25ed0f7'
        }),
        expect.objectContaining({
          l2TxHash:
            '0xa639f70688a095ce3134c4768de5ef0e2fbad804ca4bdee8dc56131b4500bcb9'
        }),
        expect.objectContaining({
          l2TxHash:
            '0xc3636c940f800ccc14e83a35448cc62ab9c5bd9bcdb25cc451769df9bd0260e0'
        }),
        expect.objectContaining({
          l2TxHash:
            '0x821b91067d86d4081639183e29d00f1e553370f979514337f1aa2b867250a269'
        })
      ])
    )
  })

  it('fetches some ETH withdrawals from subgraph pre-nitro excluding post-nitro', async () => {
    const result = await fetchETHWithdrawalsFromSubgraph({
      address: '0x41C966f99De0cA6F6531fbcAc9Db7eaBDF119744',
      fromBlock: 13744993,
      toBlock: 13956985,
      l1NetworkId: 4
    })

    expect(result).toHaveLength(2)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          l2TxHash:
            '0x72ba5c0babbdea27a4b405b041b307b8a9bd420ec8f716071136b51fc660ad2c'
        }),
        expect.objectContaining({
          l2TxHash:
            '0x9dcdafe1f4cc1b5cf3b568ed3a4b6529dcbde5c71dbe2b6ded624e3b78056b76'
        })
      ])
    )
  })
})
