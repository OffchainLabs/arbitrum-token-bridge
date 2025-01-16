import {
  StaticJsonRpcProvider,
  TransactionReceipt
} from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { ChainId } from '../types/ChainId'

type CachedReceiptsPerChain = Record<string, TransactionReceipt>
type CachedReceipts = Record<string, CachedReceiptsPerChain>

const cacheKey = `arbitrum:bridge:tx-receipts-cache`
const enableCaching = true // switch to turn off tx caching altogether (in case of emergency/hotfix)

/**
 * Encodes BigNumber properties in cached receipts for localStorage.
 * @param cachedReceipts - The receipts to encode.
 * @returns The encoded receipts.
 */
const encodeBigNumbers = (cachedReceipts: CachedReceipts) => {
  const encodedCachedReceipts: Record<string, any> = {}
  Object.keys(cachedReceipts).forEach((chainId: string) => {
    encodedCachedReceipts[chainId] = {}
    const receipts = cachedReceipts[chainId] as CachedReceiptsPerChain
    Object.keys(receipts).forEach((txHash: string) => {
      const receipt = receipts[txHash]
      const encodedReceipt: Record<string, any> = { ...receipt }

      Object.keys(encodedReceipt).forEach(key => {
        if (encodedReceipt[key]?._isBigNumber) {
          encodedReceipt[key] = {
            _type: 'BigNumber',
            _data: encodedReceipt[key].toString()
          }
        }
      })

      encodedCachedReceipts[chainId][txHash] = encodedReceipt
    })
  })
  return encodedCachedReceipts
}

const decodeBigNumbers = (cacheFromLocalStorage: Record<string, any>) => {
  let decodedCachedReceipts = {} as CachedReceipts

  Object.keys(cacheFromLocalStorage).forEach((chainId: string) => {
    decodedCachedReceipts[chainId] = {} as CachedReceiptsPerChain

    Object.keys(cacheFromLocalStorage[chainId]).forEach((txHash: string) => {
      const receipt = cacheFromLocalStorage[chainId][txHash]
      const decodedReceipt = { ...receipt }

      Object.keys(decodedReceipt).forEach(key => {
        if (decodedReceipt[key] && decodedReceipt[key]._type === 'BigNumber') {
          decodedReceipt[key] = BigNumber.from(decodedReceipt[key]._data)
        }
      })

      decodedCachedReceipts = {
        ...decodedCachedReceipts,
        [chainId]: {
          ...decodedCachedReceipts[chainId],
          [txHash]: decodedReceipt
        }
      }
    })
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
  if (!enableCaching) return undefined

  if (typeof localStorage === 'undefined') return undefined

  const cachedReceipts = localStorage.getItem(cacheKey)

  const allReceipts = cachedReceipts
    ? decodeBigNumbers(JSON.parse(cachedReceipts))
    : {}

  const cachedReceiptsPerChain = allReceipts[chainId]

  return cachedReceiptsPerChain?.[txHash]
    ? cachedReceiptsPerChain[txHash]
    : undefined
}

function addTxReceiptToCache(chainId: number, txReceipt: TransactionReceipt) {
  if (typeof localStorage === 'undefined') return

  const cachedReceipts = localStorage.getItem(cacheKey)

  const allReceipts = cachedReceipts
    ? decodeBigNumbers(JSON.parse(cachedReceipts))
    : {}

  localStorage.setItem(
    cacheKey,
    JSON.stringify(
      encodeBigNumbers({
        ...allReceipts,
        [chainId]: {
          ...(allReceipts[chainId] ?? {}),
          [txReceipt.transactionHash]: txReceipt
        }
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

    // Fetch the receipt using the original method
    const receipt = await super.getTransactionReceipt(hash)

    // Cache the receipt if it meets the criteria
    if (receipt && shouldCacheTxReceipt(chainId, receipt)) {
      addTxReceiptToCache(chainId, receipt)
    }

    return receipt
  }
}

export default EnhancedProvider
