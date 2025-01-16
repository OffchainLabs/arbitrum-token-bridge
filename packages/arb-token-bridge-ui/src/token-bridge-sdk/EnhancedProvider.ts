import {
  StaticJsonRpcProvider,
  TransactionReceipt
} from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { ChainId } from '../types/ChainId'

type CachedReceipts = Record<string, TransactionReceipt>

const cacheKey = `arbitrum:bridge:tx-receipts-cache`
const enableCaching = true

const getCacheKey = (chainId: number | string, txHash: string) =>
  `${chainId}:${txHash}`.toLowerCase()

/**
 * Encodes BigNumber properties in cached receipts for localStorage.
 * @param cachedReceipts - The receipts to encode.
 * @returns The encoded receipts.
 */
const encodeBigNumbers = (cachedReceipts: CachedReceipts) => {
  const encodedCachedReceipts: Record<string, any> = {}

  Object.entries(cachedReceipts).forEach(([key, receipt]) => {
    const encodedReceipt: Record<string, any> = { ...receipt }

    Object.keys(encodedReceipt).forEach(field => {
      if (encodedReceipt[field]?._isBigNumber) {
        encodedReceipt[field] = {
          _type: 'BigNumber',
          _data: encodedReceipt[field].toString()
        }
      }
    })

    encodedCachedReceipts[key] = encodedReceipt
  })

  return encodedCachedReceipts
}

const decodeBigNumbers = (cacheFromLocalStorage: Record<string, any>) => {
  const decodedCachedReceipts: CachedReceipts = {}

  Object.entries(cacheFromLocalStorage).forEach(([key, receipt]) => {
    const decodedReceipt = { ...receipt }

    Object.keys(decodedReceipt).forEach(field => {
      if (decodedReceipt[field]?._type === 'BigNumber') {
        decodedReceipt[field] = BigNumber.from(decodedReceipt[field]._data)
      }
    })

    decodedCachedReceipts[key] = decodedReceipt as TransactionReceipt
  })

  return decodedCachedReceipts
}

/**
 * Checks if a transaction receipt can be cached based on its status and confirmations.
 * @param chainId - The ID of the chain.
 * @param txReceipt - The transaction receipt to check.
 * @returns True if the receipt can be cached, false otherwise.
 */
const shouldCacheTxReceipt = (
  chainId: number,
  txReceipt: TransactionReceipt
): boolean => {
  if (!enableCaching) return false

  // Don't cache failed transactions
  if (typeof txReceipt.status !== 'undefined' && txReceipt.status === 0) {
    return false
  }

  // Finality checks to avoid caching re-org'ed transactions
  if (
    (chainId === ChainId.Ethereum && txReceipt.confirmations < 65) ||
    (chainId === ChainId.Sepolia && txReceipt.confirmations < 5)
  ) {
    return false
  }

  return true
}

function getTxReceiptFromCache(chainId: number, txHash: string) {
  if (!enableCaching || typeof localStorage === 'undefined') return undefined

  const cachedReceipts = localStorage.getItem(cacheKey)
  if (!cachedReceipts) return undefined

  const allReceipts = decodeBigNumbers(JSON.parse(cachedReceipts))
  return allReceipts[getCacheKey(chainId, txHash)]
}

function addTxReceiptToCache(chainId: number, txReceipt: TransactionReceipt) {
  if (typeof localStorage === 'undefined') return

  const cachedReceipts = localStorage.getItem(cacheKey)
  const allReceipts = cachedReceipts
    ? decodeBigNumbers(JSON.parse(cachedReceipts))
    : {}

  const key = getCacheKey(chainId, txReceipt.transactionHash)
  localStorage.setItem(
    cacheKey,
    JSON.stringify(
      encodeBigNumbers({
        ...allReceipts,
        [key]: txReceipt
      })
    )
  )
}

class EnhancedProvider extends StaticJsonRpcProvider {
  async getTransactionReceipt(
    transactionHash: string | Promise<string>
  ): Promise<TransactionReceipt> {
    const hash = await transactionHash
    const chainId = this.network.chainId

    // Retrieve the cached receipt for the hash, if it exists
    const cachedReceipt = getTxReceiptFromCache(chainId, hash)
    if (cachedReceipt) return cachedReceipt

    // Else, fetch the receipt using the original method
    const receipt = await super.getTransactionReceipt(hash)

    // Cache the receipt if it meets the criteria
    if (receipt && shouldCacheTxReceipt(chainId, receipt)) {
      addTxReceiptToCache(chainId, receipt)
    }

    return receipt
  }
}

export default EnhancedProvider
