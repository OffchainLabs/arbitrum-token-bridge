import { fetchTokenWithdrawalsFromSubgraph } from '../fetchTokenWithdrawalsFromSubgraph'

describe('fetchTokenWithdrawalsFromSubgraph', () => {
  it('fetches no token withdrawals from subgraph pre-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromSubgraph({
      address: '0x41C966f99De0cA6F6531fbcAc9Db7eaBDF119744',
      fromBlock: 0,
      toBlock: 11110000,
      l1NetworkId: 4
    })

    expect(result).toHaveLength(0)
  })

  it('fetches some token withdrawals from subgraph pre-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromSubgraph({
      address: '0x41C966f99De0cA6F6531fbcAc9Db7eaBDF119744',
      fromBlock: 11110000,
      toBlock: 12055296,
      l1NetworkId: 4
    })

    expect(result).toHaveLength(3)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          l2ToL1Event: expect.objectContaining({
            l2TxHash:
              '0xd747141d1bff3c9eb6c11c9bb39a0152de70267449dffe28eafd53f1989566a6'
          })
        }),
        expect.objectContaining({
          l2ToL1Event: expect.objectContaining({
            l2TxHash:
              '0x417c9d1928947f5e96b35be3843bcd1eeeacaa64a781aa5b9089a9b255f30107'
          })
        }),
        expect.objectContaining({
          l2ToL1Event: expect.objectContaining({
            l2TxHash:
              '0xcce63179f64478c81bb4d915208369a85fa5d891bfe56348109035f95fcae898'
          })
        })
      ])
    )
  })

  it('fetches some token withdrawals from subgraph pre-nitro excluding post-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromSubgraph({
      address: '0x41C966f99De0cA6F6531fbcAc9Db7eaBDF119744',
      fromBlock: 13910741,
      toBlock: 13927058,
      l1NetworkId: 4
    })

    expect(result).toHaveLength(1)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          l2ToL1Event: expect.objectContaining({
            l2TxHash:
              '0x5f64136fe311b9ec42e22ac43360f519a0728954a5f122cb93cf5214d1a113cc'
          })
        })
      ])
    )
  })
})
