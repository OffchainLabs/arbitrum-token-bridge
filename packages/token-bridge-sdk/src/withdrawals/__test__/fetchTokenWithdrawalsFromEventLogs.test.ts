import { JsonRpcProvider } from '@ethersproject/providers'
import { getL2Network, L2Network } from '@arbitrum/sdk'

import { fetchTokenWithdrawalsFromEventLogs } from '../fetchTokenWithdrawalsFromEventLogs'
import { L2_ACCOUNT_ADDRESS_ERC20, L2_PROVIDER_URL } from '../../common'

const l2Provider = new JsonRpcProvider(L2_PROVIDER_URL)

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
      address: L2_ACCOUNT_ADDRESS_ERC20,
      fromBlock: 0,
      toBlock: 12880678,
      l2Provider,
      l2GatewayAddresses
    })

    expect(result).toHaveLength(0)
  })

  it('fetches some token withdrawals from event logs pre-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromEventLogs({
      address: L2_ACCOUNT_ADDRESS_ERC20,
      fromBlock: 12880679,
      toBlock: 12889471,
      l2Provider,
      l2GatewayAddresses
    })

    expect(result).toHaveLength(4)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          txHash:
            '0xa2a31cb4aa747889245b368c93cdb0ccfa1b8e14e907763080b43112ef1dcc4e'
        }),
        expect.objectContaining({
          txHash:
            '0x815973ff35fcd84c54b8651a0c9a36d8c1ddf1bc64b18d673443c918283823c3'
        }),
        expect.objectContaining({
          txHash:
            '0x9444cd8a461963edb380d32cf11b0c6e16c2e917c11d3d81e4324a0081bf99f1'
        })
      ])
    )
  })

  it('fetches some token withdrawals from event logs pre-nitro and post-nitro', async () => {
    const result = await fetchTokenWithdrawalsFromEventLogs({
      address: L2_ACCOUNT_ADDRESS_ERC20,
      fromBlock: 22136283,
      toBlock: 22231082,
      l2Provider,
      l2GatewayAddresses
    })

    expect(result).toHaveLength(6)
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          txHash:
            '0xa9a4ff859d3d5e727c55d75da085af6b5df2eeec5e9b090f561e4180085de1e3'
        }),
        expect.objectContaining({
          txHash:
            '0xa9a4ff859d3d5e727c55d75da085af6b5df2eeec5e9b090f561e4180085de1e3'
        }),
        expect.objectContaining({
          txHash:
            '0xa9a4ff859d3d5e727c55d75da085af6b5df2eeec5e9b090f561e4180085de1e3'
        }),
        expect.objectContaining({
          txHash:
            '0xcadc107f28597db5a2dcb99390eedda0efda46e2eac5aa378a04479908385496'
        }),
        expect.objectContaining({
          txHash:
            '0xcadc107f28597db5a2dcb99390eedda0efda46e2eac5aa378a04479908385496'
        }),
        expect.objectContaining({
          txHash:
            '0xcadc107f28597db5a2dcb99390eedda0efda46e2eac5aa378a04479908385496'
        }),
        expect.objectContaining({
          txHash:
            '0xcadc107f28597db5a2dcb99390eedda0efda46e2eac5aa378a04479908385496'
        })
      ])
    )
  })
})
