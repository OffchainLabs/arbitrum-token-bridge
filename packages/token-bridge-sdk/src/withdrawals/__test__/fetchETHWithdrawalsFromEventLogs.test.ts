import { JsonRpcProvider } from '@ethersproject/providers'

import { fetchETHWithdrawalsFromEventLogs } from '../fetchETHWithdrawalsFromEventLogs'

const l2Provider = new JsonRpcProvider('https://arb1.arbitrum.io/rpc')

describe('fetchETHWithdrawalsFromEventLogs', () => {
  it('fetches no ETH withdrawals from event logs pre-nitro', async () => {
    const result = await fetchETHWithdrawalsFromEventLogs({
      address: '0xd898275e8b9428429155752f89fe0899ce232830',
      fromBlock: 0,
      toBlock: 20785771,
      l2Provider
    })

    expect(result).toHaveLength(0)
  })

  it('fetches some ETH withdrawals from event logs pre-nitro', async () => {
    const result = await fetchETHWithdrawalsFromEventLogs({
      address: '0xd898275e8b9428429155752f89fe0899ce232830',
      fromBlock: 20785772,
      toBlock: 22964111,
      l2Provider
    })

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
    const result = await fetchETHWithdrawalsFromEventLogs({
      address: '0xd898275e8b9428429155752f89fe0899ce232830',
      fromBlock: 22964112,
      toBlock: 24905369,
      l2Provider
    })

    expect(result).toHaveLength(2)
    expect(result).toEqual(
      expect.arrayContaining([
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
