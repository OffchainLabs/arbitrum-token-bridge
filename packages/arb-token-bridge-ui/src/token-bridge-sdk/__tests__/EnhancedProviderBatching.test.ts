import { http, passthrough } from 'msw'
import { setupServer } from 'msw/node'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { EnhancedProvider } from '../EnhancedProvider'
import { ChainId } from '../../types/ChainId'
import { rpcURLs } from '../../util/networks'

const rpcUrl = rpcURLs[ChainId.ArbitrumOne]!
const txHashes = [
  '0x67452e705c6c98f3f5b46cb2e8f746b87875a03bdd971886c0d45be8d0f8f491',
  '0xf7f5097afe4898d9b819c08a8c1f5be61e03bc353d4c64643614418c168e4bdb',
  '0x37188fcf248dee4a6fffb5bdc1ac43db3c5fce5a5f3714b197400593b44da695'
]

let singleRequestCount = 0
let batchedRequestCount = 0
const resetReceiptRequestCount = () => {
  singleRequestCount = 0
  batchedRequestCount = 0
}

// Setup interceptor to count RPC requests
const server = setupServer(
  http.post(rpcUrl, async ({ request }) => {
    const body = await request.json()
    // Count occurrences of 'eth_getTransactionReceipt' in the request to determine if it's batched
    const txReceiptsInRequest =
      JSON.stringify(body || '').split('eth_getTransactionReceipt').length - 1

    if (txReceiptsInRequest === 1) {
      // Single receipt request
      singleRequestCount++
      return passthrough()
    }

    if (txReceiptsInRequest === 3) {
      // Batched request containing all three receipts
      batchedRequestCount++
      return passthrough()
    }

    return passthrough()
  })
)

describe('EnhancedProvider Batching', () => {
  beforeAll(() => {
    server.listen()
  })

  afterEach(() => {
    resetReceiptRequestCount()
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  it('StaticJsonRpcProvider should make separate HTTP request for each transaction receipt', async () => {
    const staticProvider = new StaticJsonRpcProvider(
      rpcUrl,
      ChainId.ArbitrumOne
    )

    const receipts = await Promise.all(
      txHashes.map(hash => staticProvider.getTransactionReceipt(hash))
    )

    expect(singleRequestCount).toBe(3)
    expect(batchedRequestCount).toBe(0)
    expect(receipts.length).toBe(3)
  })

  it('EnhancedProvider should batch all transaction receipt requests into a single HTTP request', async () => {
    const enhancedProvider = new EnhancedProvider(rpcUrl, ChainId.ArbitrumOne)

    const receipts = await Promise.all(
      txHashes.map(hash => enhancedProvider.getTransactionReceipt(hash))
    )
    expect(singleRequestCount).toBe(0)
    expect(batchedRequestCount).toBe(1)
    expect(receipts.length).toBe(3)
  })
})
