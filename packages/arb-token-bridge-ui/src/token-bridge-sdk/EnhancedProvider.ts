import {
  StaticJsonRpcProvider,
  TransactionReceipt
} from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { ChainId } from '../types/ChainId'

type CachedReceiptsPerChain = { [txHash: string]: TransactionReceipt }
type CachedReceipts = {
  [chainId: string]: CachedReceiptsPerChain
}

const cacheKey = `arbitrum:bridge:tx-receipts-cache`
const enableCaching = true // switch to turn off tx caching altogether (in case of emergency/hotfix)

/*
 when BigNumbers are stored in localStorage, they get flattened to normal Objects and lose their `BigNumber` properties
 these are utility functions to encode and decode BigNumber data types, to and from `localStorage`
 */
const encodeBigNumbers = (cachedReceipts: CachedReceipts) => {
  const newObj: Record<string, any> = {}
  Object.keys(cachedReceipts).forEach((chainId: string) => {
    newObj[chainId] = {}
    const receipts = cachedReceipts[chainId] as CachedReceiptsPerChain
    Object.keys(receipts).forEach((txHash: string) => {
      const receipt = receipts[txHash]
      const encodedReceipt: Record<string, any> = { ...receipt }

      Object.keys(encodedReceipt).forEach(key => {
        if (encodedReceipt[key] && encodedReceipt[key]._isBigNumber) {
          encodedReceipt[key] = {
            _type: 'BigNumber',
            _data: encodedReceipt[key].toString()
          }
        }
      })

      newObj[chainId][txHash] = encodedReceipt
    })
  })
  return newObj
}

const decodeBigNumbers = (cacheFromLocalStorage: any) => {
  const newObj: Record<string, any> = {}
  Object.keys(cacheFromLocalStorage).forEach((chainId: string) => {
    newObj[chainId] = {}
    Object.keys(cacheFromLocalStorage[chainId]).forEach((txHash: string) => {
      const receipt = cacheFromLocalStorage[chainId][txHash]
      const decodedReceipt = { ...receipt }

      Object.keys(decodedReceipt).forEach(key => {
        if (decodedReceipt[key] && decodedReceipt[key]._type === 'BigNumber') {
          decodedReceipt[key] = BigNumber.from(decodedReceipt[key]._data)
        }
      })

      newObj[chainId][txHash] = decodedReceipt
    })
  })
  return newObj as CachedReceipts
}

const allowTxReceiptCaching = (
  chainId: number,
  txReceipt: TransactionReceipt
) => {
  if (!enableCaching) return false

  // don't cache failed transactions
  if (typeof txReceipt.status !== 'undefined' && txReceipt.status === 0) {
    return false
  }

  // Finality checks, to avoid caching re-org'ed transactions
  // source https://developers.circle.com/stablecoins/required-block-confirmations
  if (chainId === ChainId.Ethereum && txReceipt.confirmations < 65) {
    return false
  }
  if (chainId === ChainId.ArbitrumSepolia && txReceipt.confirmations < 5) {
    return false
  }

  return true
}

function getTxReceiptFromCache(
  chainId: number,
  txHash: string
): TransactionReceipt | undefined {
  if (!enableCaching) return undefined

  if (typeof localStorage === 'undefined') return undefined

  const cachedReceipts = localStorage.getItem(cacheKey)

  const allReceipts = cachedReceipts
    ? decodeBigNumbers(JSON.parse(cachedReceipts))
    : {}

  return allReceipts[chainId]
    ? (allReceipts[chainId][txHash] as TransactionReceipt)
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

    // Retrieve the cached receipts for the hash and return if it exists
    const cachedReceipt = getTxReceiptFromCache(chainId, hash)
    if (cachedReceipt) return cachedReceipt

    // Else, call the original method to fetch the receipt
    const receipt = await super.getTransactionReceipt(hash)

    // Cache the receipt if depending on some checks
    if (receipt && allowTxReceiptCaching(chainId, receipt)) {
      addTxReceiptToCache(this.network.chainId, receipt)
    }

    return receipt
  }
}

export default EnhancedProvider
