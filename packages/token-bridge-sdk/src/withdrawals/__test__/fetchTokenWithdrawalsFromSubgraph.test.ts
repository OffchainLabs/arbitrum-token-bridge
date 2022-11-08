import { JsonRpcProvider } from '@ethersproject/providers'

import { fetchTokenWithdrawalsFromSubgraph } from '../fetchTokenWithdrawalsFromSubgraph'

const l2Provider = new JsonRpcProvider('https://arb1.arbitrum.io/rpc')

const l2UserAddress = '0x2Ce910fBba65B454bBAf6A18c952A70f3bcd8299'

/* Note : Please ensure that Block numbers `from` and `to` should be the same in both *fromEventLogs and *fromSubgraph tests */

describe('fetchTokenWithdrawalsFromSubgraph', () => {
  it('fetches no token withdrawals from subgraph pre-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromSubgraph({
      address: l2UserAddress,
      fromBlock: 0,
      toBlock: 20961063,
      l2Provider
    })

    expect(result).toHaveLength(0)
  })

  it('fetches some token withdrawals from subgraph pre-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromSubgraph({
      address: l2UserAddress,
      fromBlock: 20961064,
      toBlock: 26317225,
      l2Provider
    })

    expect(result).toHaveLength(1)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          l2TxHash:
            '0x98c3c3bf97f177e80ac5a5adb154208e5ad43120455e624fff917a7546273800'
        })
      ])
    )
  })

  it('fetches some token withdrawals from subgraph pre-nitro and post-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromSubgraph({
      address: l2UserAddress,
      fromBlock: 20961064,
      toBlock: 35134792,
      l2Provider
    })

    expect(result).toHaveLength(5)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          l2TxHash:
            '0x98c3c3bf97f177e80ac5a5adb154208e5ad43120455e624fff917a7546273800'
        }),
        expect.objectContaining({
          l2TxHash:
            '0xcf38b3fe57a4d823d0dd4b4ba3792f51640a4575f7da8fb582e5006bf60bceb3'
        }),
        expect.objectContaining({
          l2TxHash:
            '0xbd809fa3ad466a5a88628f3f0f9fc92df4ab9d9b1bd6b3861cd87cb464a9a7c3'
        }),
        expect.objectContaining({
          l2TxHash:
            '0xbe4141f4b6847ef1f3196734beefa1ac08149abc8beba2d8d71055995cd3c29b'
        }),
        expect.objectContaining({
          l2TxHash:
            '0x420eadd347bda4bfe5d44a96e0ae68347cb181ee7a910198582e9535665cdb38'
        })
      ])
    )
  })
})
