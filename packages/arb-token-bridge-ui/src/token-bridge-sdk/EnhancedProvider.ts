import {
  Networkish,
  StaticJsonRpcProvider,
  TransactionReceipt
} from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { ChainId } from '../types/ChainId'
import { ConnectionInfo } from 'ethers/lib/utils.js'
import { isNetwork } from '../util/networks'

interface Storage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

class WebStorage implements Storage {
  getItem(key: string): string | null {
    return localStorage.getItem(key)
  }

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value)
  }
}

const localStorageKey = `arbitrum:bridge:tx-receipts-cache`
const enableCaching = (chainId: number) => {
  const txReceiptsCachingEnabledConfig =
    process.env.NEXT_PUBLIC_PROVIDER_CACHE_TX_RECEIPTS || 'testnet,mainnet' // default to 'testnet,mainnet' if not set

  return txReceiptsCachingEnabledConfig.includes(
    isNetwork(chainId).isTestnet ? 'testnet' : 'mainnet'
  )
}

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
 * Checks if a transaction receipt can be cached based on its chain and confirmations.
 * @param chainId - The ID of the chain.
 * @param txReceipt - The transaction receipt to check.
 * @returns True if the receipt can be cached, false otherwise.
 */
export const shouldCacheTxReceipt = (
  chainId: number,
  txReceipt: TransactionReceipt
): boolean => {
  if (!enableCaching(chainId)) return false

  // Finality checks to avoid caching re-org'ed transactions
  if (
    (chainId === ChainId.Ethereum && txReceipt.confirmations < 65) ||
    (chainId === ChainId.Sepolia && txReceipt.confirmations < 5)
  ) {
    return false
  }

  return true
}

function getTxReceiptFromCache(
  storage: Storage,
  chainId: number,
  txHash: string
) {
  if (!enableCaching(chainId)) return undefined

  const cachedReceipts = JSON.parse(storage.getItem(localStorageKey) || '{}')
  const receipt = cachedReceipts[getCacheKey(chainId, txHash)]

  if (!receipt) return undefined

  return txReceiptFromString(JSON.stringify(receipt))
}

function addTxReceiptToCache(
  storage: Storage,
  chainId: number,
  txReceipt: TransactionReceipt
) {
  const cachedReceipts = JSON.parse(storage.getItem(localStorageKey) || '{}')

  const key = getCacheKey(chainId, txReceipt.transactionHash)
  storage.setItem(
    localStorageKey,
    JSON.stringify({
      ...cachedReceipts,
      [key]: JSON.parse(txReceiptToString(txReceipt))
    })
  )
}

export class EnhancedProvider extends StaticJsonRpcProvider {
  private storage: Storage

  constructor(
    url?: ConnectionInfo | string,
    network?: Networkish,
    storage: Storage = new WebStorage()
  ) {
    super(url, network)
    this.storage = storage
  }

  async getTransactionReceipt(
    transactionHash: string | Promise<string>
  ): Promise<TransactionReceipt> {
    const hash = await transactionHash
    const chainId = this.network.chainId

    // Retrieve the cached receipt for the hash, if it exists
    const cachedReceipt = getTxReceiptFromCache(this.storage, chainId, hash)
    if (cachedReceipt) return cachedReceipt

    // Else, fetch the receipt using the original method
    const receipt = await super.getTransactionReceipt(hash)

    // Cache the receipt if it meets the criteria
    if (receipt && shouldCacheTxReceipt(chainId, receipt)) {
      try {
        addTxReceiptToCache(this.storage, chainId, receipt)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        // in case storage is full
      }
    }

    return receipt
  }
}
