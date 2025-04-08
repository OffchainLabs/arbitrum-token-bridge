import { http, HttpResponse, passthrough } from 'msw'
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
import {
  vi,
  describe,
  beforeEach,
  expect,
  it,
  MockInstance,
  beforeAll,
  afterEach,
  afterAll
} from 'vitest'

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

  describe('Tx Receipt Caching', () => {
    beforeEach(() => {
      storage = new TestStorage()
      vi.restoreAllMocks()
    })

    it('should fetch real transaction and use cache for subsequent requests', async () => {
      const provider = new EnhancedProvider(
        TEST_DATA.rpcUrl,
        ChainId.Sepolia,
        storage,
        { enableCaching: true, enableBatching: false }
      )
      // Wait for network to be initialized
      await provider.ready

      const txHash =
        '0x019ae29f37f27399fc2ac3f640b05e7e3700c75759026a4b4d51d7e572480e4c'

      // Mock super.getTransactionReceipt to return a successful receipt
      const mockReceipt = {
        ...TEST_DATA.mockTxReceipt,
        transactionHash: txHash
      }

      // Spy on the parent class's getTransactionReceipt that fires the RPC call
      const superGetReceipt = vi
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
          TEST_DATA.rpcUrl,
          ChainId.Sepolia,
          storage,
          { enableCaching: true, enableBatching: false }
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
          ...TEST_DATA.mockTxReceipt,
          confirmations: 4 // Below Sepolia threshold of 5
        }

        expect(
          shouldCacheTxReceipt(ChainId.Sepolia, mockReceipt, {})
        ).toBeFalsy()
      })

      it('should cache receipt when confirmations are above threshold', async () => {
        const mockReceipt = {
          ...TEST_DATA.mockTxReceipt,
          confirmations: 10 // Above Sepolia threshold of 5
        }

        // Mock the parent class's getTransactionReceipt
        vi.spyOn(
          StaticJsonRpcProvider.prototype,
          'getTransactionReceipt'
        ).mockResolvedValue(mockReceipt)

        const receipt = await provider.getTransactionReceipt(
          mockReceipt.transactionHash
        )
        expect(receipt).toBeTruthy()

        const cache = storage.getItem('arbitrum:bridge:tx-receipts-cache')
        expect(cache).toBeTruthy()
      })
    })
  })

  describe('RPC call batching', () => {
    let mockBatchSend: MockInstance
    let mockStaticSend: MockInstance

    beforeEach(() => {
      storage = new TestStorage()
      vi.restoreAllMocks()
      mockBatchSend = vi.spyOn(JsonRpcBatchProvider.prototype, 'send')
      mockStaticSend = vi.spyOn(StaticJsonRpcProvider.prototype, 'send')
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

    it(
      'should use batch provider for all RPC calls when batching is enabled',
      async () => {
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
      },
      { timeout: 10000 }
    )

    it(
      'should use static provider for all RPC calls when batching is disabled',
      async () => {
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
      },
      { timeout: 10000 }
    )

    it(
      'should batch multiple requests into single HTTP request when batching is enabled',
      async () => {
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
          ...TEST_DATA.txHashes.map(hash =>
            provider.getTransactionReceipt(hash)
          )
        ])

        // should send batched request
        expect(singleRequestCount).toBe(0)
        expect(batchedRequestCount).toBe(1)
      },
      { timeout: 10000 }
    )

    it(
      'should make individual requests when batching is disabled',
      async () => {
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
          ...TEST_DATA.txHashes.map(hash =>
            provider.getTransactionReceipt(hash)
          )
        ])

        // should send individual calls
        expect(singleRequestCount).toBe(3)
        expect(batchedRequestCount).toBe(0)
      },
      { timeout: 10000 }
    )
  })
})
