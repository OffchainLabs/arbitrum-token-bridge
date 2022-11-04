import { JsonRpcProvider } from '@ethersproject/providers'
import { L2_PROVIDER_URL, L2_ACCOUNT_ADDRESS_ETH } from '../../common'

import { fetchETHWithdrawalsFromEventLogs } from '../fetchETHWithdrawalsFromEventLogs'

const l2Provider = new JsonRpcProvider(L2_PROVIDER_URL)

describe('fetchETHWithdrawalsFromEventLogs', () => {
  it('fetches no ETH withdrawals from event logs pre-nitro', async () => {
    const result = await fetchETHWithdrawalsFromEventLogs({
      address: L2_ACCOUNT_ADDRESS_ETH,
      fromBlock: 0,
      toBlock: 2136,
      l2Provider
    })

    expect(result).toHaveLength(0)
  })

  it('fetches some ETH withdrawals from event logs pre-nitro', async () => {
    const result = await fetchETHWithdrawalsFromEventLogs({
      address: L2_ACCOUNT_ADDRESS_ETH,
      fromBlock: 2136,
      toBlock: 224417,
      l2Provider
    })

    expect(result).toHaveLength(3)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionHash:
            '0x5b52bed323fab12d6eafcf4a7f2a67efb78f20b970332aba8967602c33a6f505'
        }),
        expect.objectContaining({
          transactionHash:
            '0xe49110aa248f0cdcf977bd78dabbd3d50a81c21195a62ee9a3287bdc7bfe4977'
        }),
        expect.objectContaining({
          transactionHash:
            '0x96c9e940a9177e4c9a7bbe91ba18983df5c73c542c541cffd6d1a738c3ce52fe'
        })
      ])
    )
  })

  it('fetches some ETH withdrawals from event logs pre-nitro and post-nitro', async () => {
    const result = await fetchETHWithdrawalsFromEventLogs({
      address: L2_ACCOUNT_ADDRESS_ETH,
      fromBlock: 22204081,
      toBlock: 22216295,
      l2Provider
    })

    expect(result).toHaveLength(2)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transactionHash:
            '0xe18871590da25b062f774d841423dcdbcd54d8879b9f8851e3fffb92c655c52b'
        }),
        expect.objectContaining({
          transactionHash:
            '0xf4a0ef245233a669b0460e4134db4452b89a7d5f06815e3469b441ad4f5d0e19'
        })
      ])
    )
  })
})
