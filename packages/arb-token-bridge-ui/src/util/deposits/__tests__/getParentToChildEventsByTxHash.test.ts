import { ChainId } from '../../networks'
import { getParentToChildEventsByTxHash } from '../getParentToChildEventsByTxHash'

describe('getParentToChildEventsByTxHash', () => {
  it('fetches ETH deposit from event log when child chain provided is correct', async () => {
    const result = await getParentToChildEventsByTxHash({
      childChainId: ChainId.ArbitrumSepolia,
      txHash:
        '0xcfc3ec69ae6cbe89a8cbd0c242add626b3254540c23189d302c9fcd359630ce7'
    })

    expect(result.ethDeposits).toHaveLength(1)
    expect(result.tokenDepositRetryables).toHaveLength(0)
    expect(result.ethDeposits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
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
        })
      ])
    )
  })

  it('fetches no deposits from event log when child chain provided is wrong', async () => {
    const result = await getParentToChildEventsByTxHash({
      childChainId: ChainId.ArbitrumOne,
      txHash:
        '0xcfc3ec69ae6cbe89a8cbd0c242add626b3254540c23189d302c9fcd359630ce7'
    })

    expect(result.ethDeposits).toHaveLength(0)
    expect(result.tokenDepositRetryables).toHaveLength(0)
  })
})
