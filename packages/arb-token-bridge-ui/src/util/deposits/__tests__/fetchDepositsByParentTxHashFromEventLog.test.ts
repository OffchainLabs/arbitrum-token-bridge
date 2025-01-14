import { ChainId } from '../../networks'
import { fetchDepositsByParentTxHashFromEventLog } from '../fetchDepositsByParentTxHashFromEventLog'

describe('fetchDepositsByParentTxHashFromEventLog', () => {
  it('fetches nitro ETH deposit from event log when child chain provided is correct', async () => {
    const result = await fetchDepositsByParentTxHashFromEventLog({
      childChainId: ChainId.ArbitrumSepolia,
      txHash:
        '0xcfc3ec69ae6cbe89a8cbd0c242add626b3254540c23189d302c9fcd359630ce7'
    })

    expect(result.ethDeposits).toHaveLength(1)
    expect(result.tokenDepositRetryables).toHaveLength(0)
    expect(result.ethDeposits).toEqual([
      {
        assetName: 'ETH',
        assetType: 'ETH',
        blockNumber: 7271901,
        childChainId: 421614,
        destination: '0xfd5735380689a53e6b048e980f34cb94be9fd0c7',
        direction: 'deposit',
        isClassic: false,
        l1NetworkID: '11155111',
        l2NetworkID: '421614',
        parentChainId: 11155111,
        parentToChildMsgData: {
          childTxId:
            '0xed613c2399692ed2704f3551ffcb952c1fe2a19f856a4ad2fd4bfd047fc2f580',
          fetchingUpdate: false,
          retryableCreationTxID:
            '0xed613c2399692ed2704f3551ffcb952c1fe2a19f856a4ad2fd4bfd047fc2f580',
          status: 3
        },
        sender: '0xfd5735380689a53e6b048e980f34cb94be9fd0c7',
        source: 'event_logs',
        status: 'success',
        timestampCreated: '1734111816000',
        timestampResolved: '1734112122000',
        txID: '0xcfc3ec69ae6cbe89a8cbd0c242add626b3254540c23189d302c9fcd359630ce7',
        type: 'deposit-l1',
        value: '1.0'
      }
    ])
  })

  it('fetches nitro token deposit from event log when child chain provided is correct', async () => {
    const result = await fetchDepositsByParentTxHashFromEventLog({
      childChainId: ChainId.ArbitrumOne,
      txHash:
        '0x583bea616664fa32f68d25822bb64f18c8186221c35919a567b3de5eb9c1ae7e'
    })

    expect(result.ethDeposits).toHaveLength(0)
    expect(result.tokenDepositRetryables).toHaveLength(1)
    expect(result.tokenDepositRetryables).toEqual([
      {
        assetName: 'WBTC',
        assetType: 'ERC20',
        blockNumber: 21502346,
        childChainId: 42161,
        destination: '0x07aE8551Be970cB1cCa11Dd7a11F47Ae82e70E67',
        direction: 'deposit',
        isClassic: false,
        l1NetworkID: '1',
        l2NetworkID: '42161',
        parentChainId: 1,
        parentToChildMsgData: {
          childTxId:
            '0x80e82a211400023ad140d88caeb049bc7b629930b8a030e027565e09c73c0db4',
          fetchingUpdate: false,
          retryableCreationTxID:
            '0xdfd64b76cc4daa23f5ea989b1bc84d3a553dd8bdedc737da19289c5ff6f36a67',
          status: 4
        },
        sender: '0x07aE8551Be970cB1cCa11Dd7a11F47Ae82e70E67',
        source: 'event_logs',
        status: 'success',
        timestampCreated: '1735405559000',
        timestampResolved: '1735405934000',
        tokenAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        txID: '0x583bea616664fa32f68d25822bb64f18c8186221c35919a567b3de5eb9c1ae7e',
        type: 'deposit',
        value: '2.25871265',
        value2: undefined
      }
    ])
  })

  it('fetches no deposits from event log when child chain provided is wrong', async () => {
    const result1 = await fetchDepositsByParentTxHashFromEventLog({
      childChainId: ChainId.ArbitrumOne,
      txHash:
        '0xcfc3ec69ae6cbe89a8cbd0c242add626b3254540c23189d302c9fcd359630ce7'
    })

    expect(result1.ethDeposits).toHaveLength(0)
    expect(result1.tokenDepositRetryables).toHaveLength(0)

    const result2 = await fetchDepositsByParentTxHashFromEventLog({
      childChainId: ChainId.ArbitrumSepolia,
      txHash:
        '0x583bea616664fa32f68d25822bb64f18c8186221c35919a567b3de5eb9c1ae7e'
    })

    expect(result2.ethDeposits).toHaveLength(0)
    expect(result2.tokenDepositRetryables).toHaveLength(0)
  })
})
