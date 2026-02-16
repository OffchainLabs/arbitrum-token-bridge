import { describe, expect, it, vi } from 'vitest'
import {
  getParentToChildMessageDataFromParentTxHash,
  updateAdditionalDepositData
} from '../helpers'
import { Transaction } from '../../../types/Transactions'
import { AssetType } from '../../../hooks/arbTokenBridge.types'

vi.mock(import('../helpers'), async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    getParentToChildMessageDataFromParentTxHash: vi.fn()
  }
})

describe('updateAdditionalDepositData', () => {
  const mockedGetParentToChildMessageDataFromParentTxHash = vi.mocked(
    getParentToChildMessageDataFromParentTxHash
  )

  it('does not update tx if parent to child message is not found for deposit tx', async () => {
    mockedGetParentToChildMessageDataFromParentTxHash.mockResolvedValue({})

    const tx: Transaction = {
      type: 'deposit',
      direction: 'deposit',
      source: 'subgraph',
      parentChainId: 1,
      childChainId: 42161,
      l1NetworkID: '1',
      txID: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      blockNumber: 12345678,
      value: '1000000000000000000', // 1 ETH in wei
      status: 'pending',
      assetName: 'ETH',
      assetType: AssetType.ETH,
      sender: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      destination: '0x1234567890123456789012345678901234567890'
    }
    const result = await updateAdditionalDepositData(tx)

    expect(result).toEqual(tx)
  })
})
