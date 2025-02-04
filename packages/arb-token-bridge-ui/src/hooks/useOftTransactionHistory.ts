import { useCallback } from 'react'
import useSWR from 'swr'
import { BigNumber } from 'ethers'
import { AssetType } from './arbTokenBridge.types'
import { MergedTransaction } from '../state/app/state'
import { Address } from '../util/AddressUtils'

const LAYERZERO_API_URL = 'https://scan.layerzero-api.com/v1'

interface LayerZeroMessage {
  srcChainId: number
  dstChainId: number
  srcAddress: string
  dstAddress: string
  srcUaAddress: string
  dstUaAddress: string
  status: 'INFLIGHT' | 'DELIVERED' | 'FAILED'
  messageHash: string
  srcTxHash: string
  dstTxHash: string | null
  srcBlockHash: string
  srcBlockNumber: number
  srcBlockTimestamp: number
  dstBlockHash: string | null
  dstBlockNumber: number | null
  dstBlockTimestamp: number | null
  amount: string
  symbol: string
}

interface LayerZeroResponse {
  data: LayerZeroMessage[]
  pagination: {
    total: number
    page: number
    size: number
  }
}

function transformLayerZeroMessage(
  message: LayerZeroMessage
): MergedTransaction {
  const status =
    message.status === 'DELIVERED'
      ? 'Executed'
      : message.status === 'FAILED'
      ? 'Failure'
      : 'Unconfirmed'

  return {
    sender: message.srcAddress,
    destination: message.dstAddress,
    direction: 'deposit', // OFT transfers are like deposits
    status,
    createdAt: message.srcBlockTimestamp * 1000, // Convert to milliseconds
    resolvedAt: message.dstBlockTimestamp
      ? message.dstBlockTimestamp * 1000
      : null,
    txId: message.srcTxHash,
    asset: message.symbol,
    assetType: AssetType.ERC20, // OFT tokens are ERC20
    value: message.amount,
    value2: undefined,
    uniqueId: null,
    isWithdrawal: false,
    blockNum: message.srcBlockNumber,
    tokenAddress: message.srcUaAddress,
    childChainId: message.dstChainId,
    parentChainId: message.srcChainId,
    sourceChainId: message.srcChainId,
    destinationChainId: message.dstChainId
  }
}

export function useOftTransactionHistory(address: Address | undefined) {
  const fetcher = useCallback(
    async (url: string) => {
      if (!address) return null

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch OFT transaction history')
      }

      const data: LayerZeroResponse = await response.json()

      console.log('xxxx data', data)
      return data.data.map(transformLayerZeroMessage)
    },
    [address]
  )

  const { data, error, isLoading } = useSWR(
    address ? `${LAYERZERO_API_URL}/messages/wallet/${address}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true
    }
  )

  return {
    transactions: data || [],
    error,
    isLoading
  }
}
