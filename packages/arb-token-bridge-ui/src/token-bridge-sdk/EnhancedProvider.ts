import {
  JsonRpcBatchProvider,
  Network,
  Networkish,
  TransactionReceipt,
  StaticJsonRpcProvider
} from '@ethersproject/providers'
import { BigNumber, version } from 'ethers'
import { ChainId } from '../types/ChainId'
import { ConnectionInfo, defineReadOnly } from 'ethers/lib/utils.js'

import { Logger } from '@ethersproject/logger'
const logger = new Logger(version)

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

export type ProviderOptions = {
  enableBatching?: boolean
  enableCaching?: boolean
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
 * @param options - Provider options for caching behavior.
 * @returns True if the receipt can be cached, false otherwise.
 */
export const shouldCacheTxReceipt = (
  chainId: number,
  txReceipt: TransactionReceipt,
  options: ProviderOptions
): boolean => {
  if (!options.enableCaching) return false

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

function getTxReceiptFromCache(
  storage: Storage,
  chainId: number,
  txHash: string,
  options: ProviderOptions
) {
  if (!options.enableCaching) return undefined

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

export class EnhancedProvider extends JsonRpcBatchProvider {
  // `detectNetwork()` to give this provider StaticJsonRpcProvider's functionality
  // copied from https://github.com/ethers-io/ethers.js/blob/v5/packages/providers/src.ts/url-json-rpc-provider.ts#L28
  async detectNetwork(): Promise<Network> {
    let network = this.network
    if (network == null) {
      network = await super.detectNetwork()

      if (!network) {
        logger.throwError(
          'no network detected',
          Logger.errors.UNKNOWN_ERROR,
          {}
        )
      }

      // If still not set, set it
      if (this._network == null) {
        // A static network does not support "any"
        defineReadOnly(this, '_network', network)

        this.emit('network', network, null)
      }
    }
    return network
  }

  private storage: Storage
  private options: ProviderOptions
  private staticProvider?: StaticJsonRpcProvider

  constructor(
    url?: ConnectionInfo | string,
    network?: Networkish,
    storage: Storage = new WebStorage(),
    options: ProviderOptions = {
      enableCaching: true,
      enableBatching: true
    }
  ) {
    super(url, network)
    this.storage = storage
    this.options = options

    // Create static provider if batching is disabled
    if (!this.options.enableBatching) {
      this.staticProvider = new StaticJsonRpcProvider(url, network)
    }
  }

  // Override send method to use non-batched provider when batching is disabled
  async send(method: string, params: Array<any>): Promise<any> {
    if (!this.options.enableBatching && this.staticProvider) {
      return this.staticProvider.send(method, params)
    }
    return super.send(method, params)
  }

  async getTransactionReceipt(
    transactionHash: string | Promise<string>
  ): Promise<TransactionReceipt> {
    const hash = await transactionHash
    const chainId = this.network.chainId

    // Check cache first if caching is enabled
    const cachedReceipt = getTxReceiptFromCache(
      this.storage,
      chainId,
      hash,
      this.options
    )
    if (cachedReceipt) return cachedReceipt

    // Use appropriate provider based on batching setting
    const receipt =
      !this.options.enableBatching && this.staticProvider
        ? await this.staticProvider.getTransactionReceipt(hash)
        : await super.getTransactionReceipt(hash)

    // Cache the receipt if it meets the criteria
    if (receipt && shouldCacheTxReceipt(chainId, receipt, this.options)) {
      addTxReceiptToCache(this.storage, chainId, receipt)
    }

    return receipt
  }
}
