/**
 * Tests for EnhancedProvider functionality including:
 * 1. Transaction Receipt Caching
 * 2. Request Batching
 * 3. Confirmation Thresholds
 */

import { http, passthrough } from 'msw'
import { setupServer } from 'msw/node'
import {
  JsonRpcProvider,
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
  rpcUrls: {
    arbitrumOne: rpcURLs[ChainId.ArbitrumOne]!,
    sepolia: rpcURLs[ChainId.Sepolia]!
  },
  txHashes: [
    '0x67452e705c6c98f3f5b46cb2e8f746b87875a03bdd971886c0d45be8d0f8f491',
    '0xf7f5097afe4898d9b819c08a8c1f5be61e03bc353d4c64643614418c168e4bdb',
    '0x37188fcf248dee4a6fffb5bdc1ac43db3c5fce5a5f3714b197400593b44da695'
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
      '0x40c993848fc927ced60283b2188734b50e736d305d462289cbe231876c6570a8',
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
  http.post(TEST_DATA.rpcUrls.arbitrumOne, async ({ request }) => {
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

  beforeAll(() => {
    server.listen()
  })

  beforeEach(() => {
    storage = new TestStorage()
    jest.restoreAllMocks()
  })

  afterEach(() => {
    resetRequestCount()
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  describe('RPC call batching', () => {
    it('should make individual HTTP requests with `StaticJsonRpcProvider`', async () => {
      const provider = new StaticJsonRpcProvider(
        TEST_DATA.rpcUrls.arbitrumOne,
        ChainId.ArbitrumOne
      )

      const receipts = await Promise.all(
        TEST_DATA.txHashes.map(hash => provider.getTransactionReceipt(hash))
      )

      expect(singleRequestCount).toBe(3)
      expect(batchedRequestCount).toBe(0)
      expect(receipts.length).toBe(3)
    })

    it('should batch multiple requests into single HTTP request with `EnhancedProvider`', async () => {
      const provider = new EnhancedProvider(
        TEST_DATA.rpcUrls.arbitrumOne,
        ChainId.ArbitrumOne
      )

      const receipts = await Promise.all(
        TEST_DATA.txHashes.map(hash => provider.getTransactionReceipt(hash))
      )

      expect(singleRequestCount).toBe(0)
      expect(batchedRequestCount).toBe(1)
      expect(receipts.length).toBe(3)
    })
  })

  describe('Transaction Receipt Caching', () => {
    let provider: EnhancedProvider

    beforeEach(async () => {
      provider = new EnhancedProvider(
        TEST_DATA.rpcUrls.sepolia,
        ChainId.Sepolia,
        storage
      )
      await provider.ready
    })

    it('should cache and reuse transaction receipts', async () => {
      const txHash =
        '0x019ae29f37f27399fc2ac3f640b05e7e3700c75759026a4b4d51d7e572480e4c'
      const mockReceipt = {
        ...TEST_DATA.mockTxReceipt,
        transactionHash: txHash
      }

      const superGetReceipt = jest
        .spyOn(JsonRpcProvider.prototype, 'getTransactionReceipt')
        .mockResolvedValue(mockReceipt)

      // First request - should hit network
      const firstReceipt = await provider.getTransactionReceipt(txHash)
      expect(firstReceipt).toBeTruthy()
      expect(superGetReceipt).toHaveBeenCalledTimes(1)

      // Verify cache population
      const cache = storage.getItem('arbitrum:bridge:tx-receipts-cache')
      expect(cache).toBeTruthy()

      // Second request - should use cache
      const secondReceipt = await provider.getTransactionReceipt(txHash)
      expect(secondReceipt).toEqual(firstReceipt)
      expect(superGetReceipt).toHaveBeenCalledTimes(1)
    })

    describe('Caching: Confirmation Thresholds', () => {
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

        expect(shouldCacheTxReceipt(ChainId.Sepolia, mockReceipt)).toBeFalsy()
      })

      it('should cache receipts above confirmation threshold', async () => {
        const mockReceipt = {
          ...TEST_DATA.mockTxReceipt,
          confirmations: 10 // Above Sepolia threshold of 5
        }

        jest
          .spyOn(JsonRpcProvider.prototype, 'getTransactionReceipt')
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
})
