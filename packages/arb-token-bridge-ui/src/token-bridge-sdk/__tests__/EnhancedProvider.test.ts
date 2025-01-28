import { http, passthrough } from 'msw'
import { setupServer } from 'msw/node'
import {
  JsonRpcBatchProvider,
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

const TEST_DATA = {
  rpcUrl: rpcURLs[ChainId.Sepolia]!,
  txHashes: [
    '0xd2287acfb45a212ab347a0f8f534282cc98ea2dd93b771d46b230e467cdea730',
    '0x88d2b63dfd2876a96609c5e870a05bbcbdf44833098b1fb3118c9ef78b179451',
    '0x1ac1427f8f506e6c7d28a6631b48ce86c56650d5de05c4552f993887bec78607'
  ],
  mockTxReceipt: {
    to: '0x99E2d366BA678522F3793d2c2E758Ac29a59678E',
    from: '0x5Be7Babe02224e944582493613b00A4Caf4d56df',
    contractAddress: '',
    transactionIndex: 27,
    gasUsed: BigNumber.from(1000000000),
    logsBloom: '',
    blockHash: '',
    transactionHash:
      '0x1ac1427f8f506e6c7d28a6631b48ce86c56650d5de05c4552f993887bec78607',
    logs: [],
    blockNumber: 7483636,
    confirmations: 19088,
    cumulativeGasUsed: BigNumber.from(1000000000),
    effectiveGasPrice: BigNumber.from(1000000000),
    status: 1,
    type: 2,
    byzantium: true
  } as TransactionReceipt
}

// Test Server Setup
// ----------------

let singleRequestCount = 0
let batchedRequestCount = 0
const resetRequestCount = () => {
  singleRequestCount = 0
  batchedRequestCount = 0
}

const server = setupServer(
  http.post(TEST_DATA.rpcUrl, async ({ request }) => {
    const body = await request.json()
    const txReceiptsInRequest =
      JSON.stringify(body || '').split('eth_getTransactionReceipt').length - 1

    if (txReceiptsInRequest === 1) {
      singleRequestCount++
      return passthrough()
    }

    if (txReceiptsInRequest === 3) {
      batchedRequestCount++
      return passthrough()
    }

    return passthrough()
  })
)

describe('EnhancedProvider', () => {
  let storage: TestStorage
  let mockBatchSend: jest.SpyInstance
  let mockStaticSend: jest.SpyInstance

  beforeEach(() => {
    storage = new TestStorage()
    jest.restoreAllMocks()
    mockBatchSend = jest.spyOn(JsonRpcBatchProvider.prototype, 'send')
    mockStaticSend = jest.spyOn(StaticJsonRpcProvider.prototype, 'send')
  })

  beforeAll(() => {
    server.listen()
  })

  afterEach(() => {
    resetRequestCount()
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  describe('RPC call batching', () => {
    it('should use batch provider for all RPC calls when batching is enabled', async () => {
      const provider = new EnhancedProvider(
        TEST_DATA.rpcUrl,
        ChainId.ArbitrumOne,
        undefined,
        { enableCaching: false, enableBatching: true }
      )

      // Test various RPC methods
      await provider.getBlockNumber()
      await provider.getGasPrice()
      await Promise.all(
        TEST_DATA.txHashes.map(hash => provider.getTransactionReceipt(hash))
      )

      // All calls should go through batch provider
      expect(mockBatchSend).toHaveBeenCalled()
      expect(mockStaticSend).not.toHaveBeenCalled()
    })

    it('should use static provider for all RPC calls when batching is disabled', async () => {
      const provider = new EnhancedProvider(
        TEST_DATA.rpcUrl,
        ChainId.ArbitrumOne,
        undefined,
        { enableCaching: false, enableBatching: false }
      )

      // Test various RPC methods
      await provider.getBlockNumber()
      await provider.getGasPrice()
      await Promise.all(
        TEST_DATA.txHashes.map(hash => provider.getTransactionReceipt(hash))
      )

      // All calls should go through static provider
      expect(mockStaticSend).toHaveBeenCalled()
      expect(mockBatchSend).not.toHaveBeenCalled()
    })

    it('should batch multiple requests into single HTTP request when batching is enabled', async () => {
      const provider = new EnhancedProvider(
        TEST_DATA.rpcUrl,
        ChainId.ArbitrumOne,
        undefined,
        { enableCaching: false, enableBatching: true }
      )

      // Multiple RPC calls should be batched
      await Promise.all([
        provider.getBlockNumber(),
        provider.getGasPrice(),
        ...TEST_DATA.txHashes.map(hash => provider.getTransactionReceipt(hash))
      ])

      // should send batched request
      expect(singleRequestCount).toBe(0)
      expect(batchedRequestCount).toBe(1)
    })

    it('should make individual requests when batching is disabled', async () => {
      const provider = new EnhancedProvider(
        TEST_DATA.rpcUrl,
        ChainId.ArbitrumOne,
        undefined,
        { enableCaching: false, enableBatching: false }
      )

      // Multiple RPC calls should not be batched
      await Promise.all([
        provider.getBlockNumber(),
        provider.getGasPrice(),
        ...TEST_DATA.txHashes.map(hash => provider.getTransactionReceipt(hash))
      ])

      // should send individual calls
      expect(singleRequestCount).toBe(3)
      expect(batchedRequestCount).toBe(0)
    })
  })

  describe('Transaction Receipt Caching', () => {
    let provider: EnhancedProvider

    it('should cache and reuse transaction receipts with batching enabled', async () => {
      const provider = new EnhancedProvider(
        TEST_DATA.rpcUrl,
        ChainId.Sepolia,
        undefined,
        { enableCaching: true, enableBatching: true }
      )

      const txHash = TEST_DATA.txHashes[0]!

      // First request - should hit network
      const firstReceipt = await provider.getTransactionReceipt(txHash)
      expect(firstReceipt).toBeTruthy()
      expect(batchedRequestCount).toBe(1)
      expect(singleRequestCount).toBe(0)

      // Verify cache population
      const cache = storage.getItem('arbitrum:bridge:tx-receipts-cache')
      expect(cache).toBeTruthy()

      // reset request count
      resetRequestCount()
      server.resetHandlers()

      // Second request - should use cache
      const secondReceipt = await provider.getTransactionReceipt(txHash)
      expect(secondReceipt).toEqual(firstReceipt)
      expect(batchedRequestCount).toBe(0)
      expect(singleRequestCount).toBe(0) // No additional calls
    })

    it('should cache and reuse transaction receipts with batching disabled', async () => {
      const provider = new EnhancedProvider(
        TEST_DATA.rpcUrl,
        ChainId.Sepolia,
        storage,
        { enableCaching: true, enableBatching: false }
      )

      const txHash = TEST_DATA.mockTxReceipt.transactionHash

      // Mock static provider for receipt calls
      mockStaticSend.mockImplementation(async (method, params) => {
        if (method === 'eth_getTransactionReceipt') {
          return {
            ...TEST_DATA.mockTxReceipt,
            transactionHash: params[0],
            confirmations: 10 // Above threshold
          }
        }
        return {}
      })

      // First request - should hit network
      await provider.getTransactionReceipt(txHash)
      expect(mockStaticSend).toHaveBeenCalledTimes(1)
      expect(mockBatchSend).not.toHaveBeenCalled()

      // Second request - should use cache
      await provider.getTransactionReceipt(txHash)
      expect(mockStaticSend).toHaveBeenCalledTimes(1) // No additional calls

      // Verify cache was created
      const cache = storage.getItem('arbitrum:bridge:tx-receipts-cache')
      expect(cache).toBeTruthy()
    })

    it('should not cache when caching is disabled with batching enabled', async () => {
      const provider = new EnhancedProvider(
        TEST_DATA.rpcUrl,
        ChainId.Sepolia,
        storage,
        { enableCaching: false, enableBatching: true }
      )

      const txHash = TEST_DATA.mockTxReceipt.transactionHash
      mockBatchSend.mockResolvedValue(TEST_DATA.mockTxReceipt)

      // First request
      await provider.getTransactionReceipt(txHash)
      expect(mockBatchSend).toHaveBeenCalledTimes(1)

      // Second request - should hit network again
      await provider.getTransactionReceipt(txHash)
      expect(mockBatchSend).toHaveBeenCalledTimes(2)

      // Verify no cache was created
      const cache = storage.getItem('arbitrum:bridge:tx-receipts-cache')
      expect(cache).toBe(null)
    })

    it('should not cache when caching is disabled with batching disabled', async () => {
      const provider = new EnhancedProvider(
        TEST_DATA.rpcUrl,
        ChainId.Sepolia,
        storage,
        { enableCaching: false, enableBatching: false }
      )

      const txHash = TEST_DATA.mockTxReceipt.transactionHash
      const superGetReceipt = jest
        .spyOn(StaticJsonRpcProvider.prototype, 'getTransactionReceipt')
        .mockResolvedValue(TEST_DATA.mockTxReceipt)

      // First request
      await provider.getTransactionReceipt(txHash)
      expect(superGetReceipt).toHaveBeenCalledTimes(1)
      expect(mockBatchSend).not.toHaveBeenCalled()

      // Second request - should hit network again
      await provider.getTransactionReceipt(txHash)
      expect(superGetReceipt).toHaveBeenCalledTimes(2)

      // Verify no cache was created
      const cache = storage.getItem('arbitrum:bridge:tx-receipts-cache')
      expect(cache).toBe(null)
    })

    describe('Caching: Confirmation Thresholds', () => {
      const defaultOptions = { enableCaching: true, enableBatching: true }

      beforeEach(async () => {
        Object.defineProperty(provider, 'network', {
          value: { chainId: ChainId.Sepolia, name: 'sepolia' },
          writable: true
        })
      })

      it('should not cache receipts below confirmation threshold', async () => {
        const mockReceipt = {
          ...TEST_DATA.mockTxReceipt,
          confirmations: 4 // Below Sepolia threshold of 5
        }

        expect(
          shouldCacheTxReceipt(ChainId.Sepolia, mockReceipt, defaultOptions)
        ).toBeFalsy()
      })

      it('should cache receipts above confirmation threshold', async () => {
        const mockReceipt = {
          ...TEST_DATA.mockTxReceipt,
          confirmations: 10 // Above Sepolia threshold of 5
        }

        mockBatchSend.mockImplementation(async (method, params) => {
          if (method === 'eth_getTransactionReceipt') {
            return mockReceipt
          }
          return {}
        })

        const receipt = await provider.getTransactionReceipt(
          mockReceipt.transactionHash
        )
        expect(receipt).toBeTruthy()

        const cache = storage.getItem('arbitrum:bridge:tx-receipts-cache')
        expect(cache).toBeTruthy()
      })

      it('should not cache when caching is disabled regardless of confirmations', async () => {
        const mockReceipt = {
          ...TEST_DATA.mockTxReceipt,
          confirmations: 10 // Above threshold
        }

        expect(
          shouldCacheTxReceipt(ChainId.Sepolia, mockReceipt, {
            enableCaching: false,
            enableBatching: true
          })
        ).toBeFalsy()
      })
    })
  })
})
