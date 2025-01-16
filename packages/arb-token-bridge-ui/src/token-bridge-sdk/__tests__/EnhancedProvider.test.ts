import {
  StaticJsonRpcProvider,
  TransactionReceipt
} from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { ChainId } from '../../types/ChainId'
import { rpcURLs } from '../../util/networks'
import EnhancedProvider from '../EnhancedProvider'

type LocalStorageMock = {
  store: Record<string, string>
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  clear: () => void
}
const localStorageMock: LocalStorageMock = {
  store: {},
  getItem(key: string) {
    return this.store[key] || null
  },
  setItem(key: string, value: string) {
    this.store[key] = value
  },
  clear() {
    this.store = {}
  }
}

const testTxReceipt: TransactionReceipt = {
  to: '0xaAe29B0366299461418F5324a79Afc425BE5ae21',
  from: '0x2cd28Cda6825C4967372478E87D004637B73F996',
  contractAddress: '',
  transactionIndex: 27,
  gasUsed: BigNumber.from(1000000000),
  logsBloom:
    '0x00000000000000000000000120000000000000000000000000001000400000002000000000000000000000001000000000800000020000000000000000000080000000000000000000000000000000000000000080000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000020000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000004000000000000000000000000000000000000000000000000004200',
  blockHash:
    '0xc7b6876c652e043ef36e28df48f5a7632670c6c6a779b4074ab01a744ad90c5e',
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

// Set up localStorage mock before tests
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

describe('EnhancedProvider', () => {
  beforeEach(() => {
    localStorageMock.clear()
    jest.restoreAllMocks()
  })

  describe('Real provider tests', () => {
    it('should fetch real transaction and use cache for subsequent requests', async () => {
      const provider = new EnhancedProvider(rpcURLs[ChainId.Sepolia])
      // Wait for network to be initialized
      await provider.ready

      const txHash =
        '0x019ae29f37f27399fc2ac3f640b05e7e3700c75759026a4b4d51d7e572480e4c'

      // Mock super.getTransactionReceipt to return a successful receipt
      const mockReceipt = { ...testTxReceipt, transactionHash: txHash }

      // Spy on the parent's getTransactionReceipt
      const superGetReceipt = jest
        .spyOn(StaticJsonRpcProvider.prototype, 'getTransactionReceipt')
        .mockResolvedValue(mockReceipt)

      // First request - should hit the network
      const firstReceipt = await provider.getTransactionReceipt(txHash)
      expect(firstReceipt).toBeTruthy()
      expect(superGetReceipt).toHaveBeenCalledTimes(1)

      // Check if cache was populated
      const cache = localStorage.getItem('arbitrum:bridge:tx-receipts-cache')
      expect(cache).toBeTruthy()

      // Second request - should use cache
      const secondReceipt = await provider.getTransactionReceipt(txHash)
      expect(secondReceipt).toEqual(firstReceipt)
      expect(superGetReceipt).toHaveBeenCalledTimes(1) // No additional RPC calls
    })
  })

  describe('Mock provider tests', () => {
    let provider: EnhancedProvider

    beforeEach(async () => {
      provider = new EnhancedProvider('https://mock.url')
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

      // Mock the parent's getTransactionReceipt
      jest
        .spyOn(StaticJsonRpcProvider.prototype, 'getTransactionReceipt')
        .mockResolvedValue(mockReceipt)

      const receipt = await provider.getTransactionReceipt(
        testTxReceipt.transactionHash
      )
      expect(receipt).toBeTruthy()

      const cache = localStorage.getItem('arbitrum:bridge:tx-receipts-cache')
      expect(cache).toBeFalsy()
    })

    it('should cache receipt when confirmations are above threshold', async () => {
      const mockReceipt = {
        ...testTxReceipt,
        confirmations: 10 // Above Sepolia threshold of 5
      }

      // Mock the parent's getTransactionReceipt
      jest
        .spyOn(StaticJsonRpcProvider.prototype, 'getTransactionReceipt')
        .mockResolvedValue(mockReceipt)

      const receipt = await provider.getTransactionReceipt('0x1234')
      expect(receipt).toBeTruthy()

      const cache = localStorage.getItem('arbitrum:bridge:tx-receipts-cache')
      expect(cache).toBeTruthy()
    })

    it('should not cache failed transactions', async () => {
      const mockReceipt = {
        ...testTxReceipt,
        status: 0 // Failed transaction
      }

      // Mock the parent's getTransactionReceipt
      jest
        .spyOn(StaticJsonRpcProvider.prototype, 'getTransactionReceipt')
        .mockResolvedValue(mockReceipt)

      const receipt = await provider.getTransactionReceipt(
        testTxReceipt.transactionHash
      )
      expect(receipt).toBeTruthy()
      expect(receipt.status).toBe(0)

      const cache = localStorage.getItem('arbitrum:bridge:tx-receipts-cache')
      expect(cache).toBeFalsy()
    })
  })
})
