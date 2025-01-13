import {
  StaticJsonRpcProvider,
  TransactionReceipt
} from '@ethersproject/providers'
import { BigNumber } from 'ethers'

const cacheKey = `arbitrum:bridge:tx-receipts`
const cacheLogs = false

/*
 when BigNumbers are stored in localStorage, they get flattened to normal Objects and lose their `BigNumber` properties
 these are utility functions to serialize and deserialize BigNumber data types, to and from `localStorage`
 */
BigNumber.prototype.toJSON = function toJSON() {
  return {
    _type: 'BigNumber',
    _data: Object.assign({}, this)
  }
}
function getBigNumberFromJSON(_key: string, value: any) {
  let result = value
  if (
    typeof value === 'object' &&
    value !== null &&
    value.hasOwnProperty('_type')
  ) {
    switch (value._type) {
      case 'BigNumber':
        result = BigNumber.from(value._data)
    }
  }
  return result
}

function getTxReceiptFromCache(
  chainId: number,
  txHash: string
): TransactionReceipt | undefined {
  if (typeof localStorage === 'undefined') return undefined

  const cachedReceipts = localStorage.getItem(cacheKey)

  const allReceipts = cachedReceipts
    ? JSON.parse(cachedReceipts, getBigNumberFromJSON)
    : {}

  return allReceipts[chainId]
    ? (allReceipts[chainId][txHash] as TransactionReceipt)
    : undefined
}

function addTxReceiptToCache(chainId: number, txReceipt: TransactionReceipt) {
  if (typeof localStorage === 'undefined') return

  const cachedReceipts = localStorage.getItem(cacheKey)

  const allReceipts = cachedReceipts
    ? JSON.parse(cachedReceipts, getBigNumberFromJSON)
    : {}

  localStorage.setItem(
    cacheKey,
    JSON.stringify({
      ...allReceipts,
      [chainId]: {
        ...(allReceipts[chainId] ?? {}),
        [txReceipt.transactionHash]: txReceipt
      }
    })
  )
}

class EnhancedProvider extends StaticJsonRpcProvider {
  async getTransactionReceipt(
    transactionHash: string | Promise<string>
  ): Promise<TransactionReceipt> {
    const hash = await transactionHash

    // Retrieve the cached receipts for the specific
    const cachedReceipt = getTxReceiptFromCache(this.network.chainId, hash)
    // Check if the receipt is already cached
    if (cachedReceipt) {
      if (cacheLogs) console.log(`Cache hit for transaction: ${hash}`)

      return cachedReceipt
    }

    if (cacheLogs) console.log(`Cache miss for transaction: ${hash}`)

    // Call the original method to fetch the receipt
    const receipt = await super.getTransactionReceipt(hash)

    // Cache the receipt if it exists
    if (receipt) {
      addTxReceiptToCache(this.network.chainId, receipt)

      if (cacheLogs) console.log(`Added transaction to cache: ${hash}`)
    }

    return receipt
  }
}

export default EnhancedProvider
