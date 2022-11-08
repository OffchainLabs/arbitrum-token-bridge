import { JsonRpcProvider } from '@ethersproject/providers'
import { getL2Network, L2Network } from '@arbitrum/sdk'

import { fetchTokenWithdrawalsFromEventLogs } from '../fetchTokenWithdrawalsFromEventLogs'

const l2Provider = new JsonRpcProvider('https://arb1.arbitrum.io/rpc')

let l2Network: L2Network
let l2GatewayAddresses: string[]

beforeAll(async () => {
  l2Network = await getL2Network(l2Provider)

  const tokenBridge = l2Network.tokenBridge
  const { l2ERC20Gateway, l2CustomGateway, l2WethGateway } = tokenBridge

  l2GatewayAddresses = [l2ERC20Gateway, l2CustomGateway, l2WethGateway]
})

describe('fetchTokenWithdrawalsFromEventLogs', () => {
  it('fetches no token withdrawals from event logs pre-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromEventLogs({
      address: '0x2Ce910fBba65B454bBAf6A18c952A70f3bcd8299',
      fromBlock: 0,
      toBlock: 20961063,
      l2Provider,
      l2GatewayAddresses
    })

    expect(result).toHaveLength(0)
  })

  it('fetches some token withdrawals from event logs pre-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromEventLogs({
      address: '0x2Ce910fBba65B454bBAf6A18c952A70f3bcd8299',
      fromBlock: 20961064,
      toBlock: 26317225,
      l2Provider,
      l2GatewayAddresses
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
    const result = await fetchTokenWithdrawalsFromEventLogs({
      address: '0x2Ce910fBba65B454bBAf6A18c952A70f3bcd8299',
      fromBlock: 20961064,
      toBlock: 35134792,
      l2Provider,
      l2GatewayAddresses
    })

    expect(result).toHaveLength(5)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          txHash:
            '0x98c3c3bf97f177e80ac5a5adb154208e5ad43120455e624fff917a7546273800'
        }),
        expect.objectContaining({
          txHash:
            '0xcf38b3fe57a4d823d0dd4b4ba3792f51640a4575f7da8fb582e5006bf60bceb3'
        }),
        expect.objectContaining({
          txHash:
            '0xbd809fa3ad466a5a88628f3f0f9fc92df4ab9d9b1bd6b3861cd87cb464a9a7c3'
        }),
        expect.objectContaining({
          txHash:
            '0xbe4141f4b6847ef1f3196734beefa1ac08149abc8beba2d8d71055995cd3c29b'
        }),
        expect.objectContaining({
          txHash:
            '0x420eadd347bda4bfe5d44a96e0ae68347cb181ee7a910198582e9535665cdb38'
        })
      ])
    )
  })
})
