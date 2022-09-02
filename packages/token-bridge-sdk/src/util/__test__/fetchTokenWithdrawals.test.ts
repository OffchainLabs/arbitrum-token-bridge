import { JsonRpcProvider } from '@ethersproject/providers'
import { getL2Network, L2Network } from '@arbitrum/sdk'
import 'cross-fetch/polyfill'

import { fetchTokenWithdrawalsFromEventLogs } from '../fetchTokenWithdrawals'

const l2Provider = new JsonRpcProvider('https://rinkeby.arbitrum.io/rpc')

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
      address: '0x41C966f99De0cA6F6531fbcAc9Db7eaBDF119744',
      fromBlock: 0,
      toBlock: 11110000,
      l2Network,
      l2Provider,
      l2GatewayAddresses
    })

    expect(result).toHaveLength(0)
  })

  it('fetches some token withdrawals from event logs pre-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromEventLogs({
      address: '0x41C966f99De0cA6F6531fbcAc9Db7eaBDF119744',
      fromBlock: 11110000,
      toBlock: 12055296,
      l2Network,
      l2Provider,
      l2GatewayAddresses
    })

    expect(result).toHaveLength(3)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          txHash:
            '0xd747141d1bff3c9eb6c11c9bb39a0152de70267449dffe28eafd53f1989566a6'
        }),
        expect.objectContaining({
          txHash:
            '0x417c9d1928947f5e96b35be3843bcd1eeeacaa64a781aa5b9089a9b255f30107'
        }),
        expect.objectContaining({
          txHash:
            '0xcce63179f64478c81bb4d915208369a85fa5d891bfe56348109035f95fcae898'
        })
      ])
    )
  })

  it('fetches some token withdrawals from event logs pre-nitro and post-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromEventLogs({
      address: '0x41C966f99De0cA6F6531fbcAc9Db7eaBDF119744',
      fromBlock: 13910741,
      toBlock: 13927058,
      l2Network,
      l2Provider,
      l2GatewayAddresses
    })

    expect(result).toHaveLength(2)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          txHash:
            '0x5f64136fe311b9ec42e22ac43360f519a0728954a5f122cb93cf5214d1a113cc'
        }),
        expect.objectContaining({
          txHash:
            '0xd9b0a17fc302210a0c084f55f653ab654c72aecbe1a2a2e3edf707c34261217f'
        })
      ])
    )
  })
})
