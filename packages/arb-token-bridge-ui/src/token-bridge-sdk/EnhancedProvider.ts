import {
  JsonRpcBatchProvider,
  TransactionReceipt
} from '@ethersproject/providers'

class EnhancedProvider extends JsonRpcBatchProvider {
  private chainId: number

  constructor(url?: string, chainId?: number) {
    super(url)

    if (typeof chainId === 'undefined')
      throw Error('could not initialize provider')

    this.chainId = chainId
  }

  async getTransactionReceipt(
    transactionHash: string | Promise<string>
  ): Promise<TransactionReceipt> {
    const hash = await transactionHash
    const cacheKey = `arbitrum:bridge:tx-receipts:${this.chainId}`

    // Retrieve the cached receipts for the specific chainId
    const cachedReceipts = localStorage.getItem(cacheKey)
    const receiptsMap = cachedReceipts ? JSON.parse(cachedReceipts) : {}

    // Check if the receipt is already cached
    if (receiptsMap[hash]) {
      console.log(`Cache hit for transaction: ${hash}`)
      return receiptsMap[hash] as TransactionReceipt
    }

    console.log(`Cache miss for transaction: ${hash}`)

    // Call the original method to fetch the receipt
    const receipt = await super.getTransactionReceipt(hash)

    // Cache the receipt if it exists
    if (receipt) {
      receiptsMap[hash] = receipt
      localStorage.setItem(cacheKey, JSON.stringify(receiptsMap))
      console.log(`Added transaction to cache: ${hash}`)
    }

    return receipt
  }
}

export default EnhancedProvider
