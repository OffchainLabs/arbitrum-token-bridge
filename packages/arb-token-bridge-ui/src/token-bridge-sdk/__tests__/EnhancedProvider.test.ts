import {
  StaticJsonRpcProvider,
  TransactionReceipt
} from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { ChainId } from '../../types/ChainId'
import { rpcURLs } from '../../util/networks'
import { EnhancedProvider, shouldCacheTxReceipt } from '../EnhancedProvider'

class TestStorage {
  private store: Record<string, string> = {}
  getItem(key: string): string | null {
    return this.store[key] || null
  }
  setItem(key: string, value: string): void {
    this.store[key] = value
  }
  clear(): void {
    this.store = {}
  }
}

// a type-safe test transaction receipt which can be extended as per our test cases
const testTxReceipt: TransactionReceipt = {
  to: '0x99E2d366BA678522F3793d2c2E758Ac29a59678E',
  from: '0x5Be7Babe02224e944582493613b00A4Caf4d56df',
  contractAddress: '',
  transactionIndex: 27,
  gasUsed: BigNumber.from(1000000000),
  logsBloom: '',
  blockHash: '',
  transactionHash:
    '0x40c993848fc927ced60283b2188734b50e736d305d462289cbe231876c6570a8',
  logs: [],
  blockNumber: 7483636,
  confirmations: 19088,
  cumulativeGasUsed: BigNumber.from(1000000000),
  effectiveGasPrice: BigNumber.from(1000000000),
  status: 1,
  type: 2,
  byzantium: true
}

describe('EnhancedProvider', () => {
  let storage: TestStorage

  beforeEach(() => {
    storage = new TestStorage()
    jest.restoreAllMocks()
  })

  it('should fetch real transaction and use cache for subsequent requests', async () => {
    const rpcUrl = rpcURLs[ChainId.Sepolia]!

    const provider = new EnhancedProvider(rpcUrl, ChainId.Sepolia, storage)
    // Wait for network to be initialized
    await provider.ready

    const txHash =
      '0x019ae29f37f27399fc2ac3f640b05e7e3700c75759026a4b4d51d7e572480e4c'

    // Mock super.getTransactionReceipt to return a successful receipt
    const mockReceipt = { ...testTxReceipt, transactionHash: txHash }

    // Spy on the parent class's getTransactionReceipt that fires the RPC call
    const superGetReceipt = jest
      .spyOn(StaticJsonRpcProvider.prototype, 'getTransactionReceipt')
      .mockResolvedValue(mockReceipt)

    // First request - should hit the network
    const firstReceipt = await provider.getTransactionReceipt(txHash)
    expect(firstReceipt).toBeTruthy()
    expect(superGetReceipt).toHaveBeenCalledTimes(1)

    // Check if cache was populated
    const cache = storage.getItem('arbitrum:bridge:tx-receipts-cache')
    expect(cache).toBeTruthy()

    // Second request - should use cache
    const secondReceipt = await provider.getTransactionReceipt(txHash)
    expect(secondReceipt).toEqual(firstReceipt)
    expect(superGetReceipt).toHaveBeenCalledTimes(1) // No additional RPC calls
  })

  describe('Caching condition tests', () => {
    let provider: EnhancedProvider

    beforeEach(async () => {
      provider = new EnhancedProvider(
        'https://mock.url',
        ChainId.Sepolia,
        storage
      )
      // Mock the network property
      Object.defineProperty(provider, 'network', {
        value: { chainId: ChainId.Sepolia, name: 'sepolia' },
        writable: true
      })
      // Wait for provider to be ready
      await provider.ready
    })

    it('should not cache receipt when confirmations are below threshold', async () => {
      const mockReceipt = {
        ...testTxReceipt,
        confirmations: 4 // Below Sepolia threshold of 5
      }

      expect(shouldCacheTxReceipt(ChainId.Sepolia, mockReceipt)).toBeFalsy()
    })

    it('should cache receipt when confirmations are above threshold', async () => {
      const mockReceipt = {
        ...testTxReceipt,
        confirmations: 10 // Above Sepolia threshold of 5
      }

      // Mock the parent class's getTransactionReceipt
      jest
        .spyOn(StaticJsonRpcProvider.prototype, 'getTransactionReceipt')
        .mockResolvedValue(mockReceipt)

      const receipt = await provider.getTransactionReceipt(
        mockReceipt.transactionHash
      )
      expect(receipt).toBeTruthy()

      const cache = storage.getItem('arbitrum:bridge:tx-receipts-cache')
      expect(cache).toBeTruthy()
    })
  })
})
