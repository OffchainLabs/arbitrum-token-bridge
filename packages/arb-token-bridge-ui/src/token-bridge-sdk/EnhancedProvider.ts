import {
  StaticJsonRpcProvider,
  TransactionReceipt
} from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { ChainId } from '../types/ChainId'

type CachedReceipts = Record<string, TransactionReceipt>

const localStorageKey = `arbitrum:bridge:tx-receipts-cache`
const enableCaching = true

const getCacheKey = (chainId: number | string, txHash: string) =>
  `${chainId}:${txHash}`.toLowerCase()

/**
 * Converts a TransactionReceipt to a string by encoding BigNumber properties.
 * @param txReceipt - The receipt to encode.
 * @returns The encoded receipt as a string.
 */
const txReceiptToString = (txReceipt: TransactionReceipt): string => {
  const encodedReceipt: Record<string, any> = { ...txReceipt }

  Object.keys(encodedReceipt).forEach(field => {
    if (encodedReceipt[field]?._isBigNumber) {
      encodedReceipt[field] = {
        _type: 'BigNumber',
        _data: encodedReceipt[field].toString()
      }
    }
  })

  return JSON.stringify(encodedReceipt)
}

/**
 * Converts a stringified receipt back to a TransactionReceipt by decoding BigNumber properties.
 * @param stringified - The stringified receipt to decode.
 * @returns The decoded TransactionReceipt.
 */
const txReceiptFromString = (stringified: string): TransactionReceipt => {
  const receipt = JSON.parse(stringified)
  const decodedReceipt = { ...receipt }

  Object.keys(decodedReceipt).forEach(field => {
    if (decodedReceipt[field]?._type === 'BigNumber') {
      decodedReceipt[field] = BigNumber.from(decodedReceipt[field]._data)
    }
  })

  return decodedReceipt as TransactionReceipt
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
  if (txReceipt.status === 0) {
    return false
  }

  // Finality checks to avoid caching re-org'ed transactions
  if (
    (chainId === ChainId.Ethereum && txReceipt.confirmations < 65) ||
    (chainId === ChainId.Sepolia && txReceipt.confirmations < 5) ||
    (chainId === ChainId.Holesky && txReceipt.confirmations < 5)
  ) {
    return false
  }

  return true
}

function getTxReceiptFromCache(chainId: number, txHash: string) {
  if (!enableCaching || typeof localStorage === 'undefined') return undefined

  const cachedReceipts = localStorage.getItem(localStorageKey)
  if (!cachedReceipts) return undefined

  const allReceipts: CachedReceipts = {}
  const parsedReceipts = JSON.parse(cachedReceipts)

  Object.entries(parsedReceipts).forEach(([key, receipt]) => {
    allReceipts[key] = txReceiptFromString(JSON.stringify(receipt))
  })

  return allReceipts[getCacheKey(chainId, txHash)]
}

function addTxReceiptToCache(chainId: number, txReceipt: TransactionReceipt) {
  if (typeof localStorage === 'undefined') return

  const cachedReceipts = localStorage.getItem(localStorageKey)
  const allReceipts: CachedReceipts = {}

  if (cachedReceipts) {
    const parsedReceipts = JSON.parse(cachedReceipts)
    Object.entries(parsedReceipts).forEach(([key, receipt]) => {
      allReceipts[key] = JSON.parse(
        txReceiptToString(receipt as TransactionReceipt)
      )
    })
  }

  const key = getCacheKey(chainId, txReceipt.transactionHash)
  localStorage.setItem(
    localStorageKey,
    JSON.stringify({
      ...allReceipts,
      [key]: JSON.parse(txReceiptToString(txReceipt))
    })
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
