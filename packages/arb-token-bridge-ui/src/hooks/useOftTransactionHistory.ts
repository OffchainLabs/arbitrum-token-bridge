import { useCallback } from 'react'
import useSWR from 'swr'
import { AssetType } from './arbTokenBridge.types'
import { MergedTransaction } from '../state/app/state'
import { CommonAddress } from '../util/CommonAddressUtils'
import { getChainIdFromEid } from '../token-bridge-sdk/oftUtils'
import { isDepositMode } from '../util/isDepositMode'
import { useAccount } from 'wagmi'
import { getProviderForChainId } from '../token-bridge-sdk/utils'

const LAYERZERO_API_URL_MAINNET = 'https://scan.layerzero-api.com/v1'
const LAYERZERO_API_URL_TESTNET = 'https://scan-testnet.layerzero-api.com/v1'

export enum LayerZeroMessageStatus {
  INFLIGHT = 'INFLIGHT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  PAYLOAD_STORED = 'PAYLOAD_STORED',
  BLOCKED = 'BLOCKED',
  CONFIRMING = 'CONFIRMING'
}

interface LayerZeroMessage {
  pathway: {
    srcEid: number
    dstEid: number
    sender: {
      address: string
      id: string
      name: string
      chain: string
    }
    receiver: {
      address: string
      chain: string
    }
    id: string
    nonce: number
  }
  source: {
    status: string
    tx: {
      txHash: string
      blockHash: string
      blockNumber: string
      blockTimestamp: number
      from: string
      payload: string
      readinessTimestamp: number
      options: {
        lzReceive: {
          gas: string
          value: string
        }
        ordered: boolean
      }
    }
  }
  destination: {
    nativeDrop: {
      status: string
    }
    lzCompose: {
      status: string
    }
    tx: {
      txHash: string
      blockHash: string
      blockNumber: number
      blockTimestamp: number
    }
    status: string
  }
  verification: {
    dvn: {
      dvns: {
        [key: string]: {
          txHash: string
          blockHash: string
          blockNumber: number
          blockTimestamp: number
          proof: {
            packetHeader: string
            payloadHash: string
          }
          optional: boolean
          status: string
        }
      }
      status: string
    }
    sealer: {
      tx: {
        txHash: string
        blockHash: string
        blockNumber: number
        blockTimestamp: number
      }
      status: string
    }
  }
  guid: string
  config: {
    error: boolean
    receiveLibrary: string
    sendLibrary: string
    inboundConfig: {
      confirmations: number
      requiredDVNCount: number
      optionalDVNCount: number
      optionalDVNThreshold: number
      requiredDVNs: string[]
      requiredDVNNames: string[]
      optionalDVNs: string[]
      optionalDVNNames: string[]
    }
    outboundConfig: {
      confirmations: number
      requiredDVNCount: number
      optionalDVNCount: number
      optionalDVNThreshold: number
      requiredDVNs: string[]
      requiredDVNNames: string[]
      optionalDVNs: string[]
      optionalDVNNames: string[]
      executor: string
    }
    ulnSendVersion: string
    ulnReceiveVersion: string
  }
  status: {
    name: string
    message: string
  }
  created: string
  updated: string
}

const getOftTransactionStatus = (message: LayerZeroMessage) => {
  switch (message.status.name) {
    case LayerZeroMessageStatus.INFLIGHT ||
      LayerZeroMessageStatus.CONFIRMING ||
      LayerZeroMessageStatus.PAYLOAD_STORED:
      return 'pending'
    case LayerZeroMessageStatus.DELIVERED:
      return 'success'
    case LayerZeroMessageStatus.FAILED || LayerZeroMessageStatus.BLOCKED:
      return 'failed'
    default:
      return 'pending'
  }
}

function validateSourceAndDestinationChainIds(message: LayerZeroMessage) {
  const sourceChainId = getChainIdFromEid(message.pathway.srcEid)
  const destinationChainId = getChainIdFromEid(message.pathway.dstEid)

  if (!sourceChainId || !destinationChainId) {
    return false
  }

  return true
}

function mapLayerZeroMessageToMergedTransaction(
  message: LayerZeroMessage
): MergedTransaction {
  const sourceChainId = getChainIdFromEid(message.pathway.srcEid)
  const destinationChainId = getChainIdFromEid(message.pathway.dstEid)

  if (!sourceChainId || !destinationChainId) {
    throw new Error('Invalid chain ids')
  }

  const isDeposit = isDepositMode({
    sourceChainId,
    destinationChainId
  })

  return {
    isOft: true,
    sender: message.source.tx.from,
    destination: undefined, // TODO:to be filled later
    direction: isDeposit ? 'deposit' : 'withdraw',
    status: getOftTransactionStatus(message),
    createdAt: new Date(message.created).getTime(),
    resolvedAt:
      getOftTransactionStatus(message) === 'pending'
        ? null
        : new Date(message.updated).getTime(),
    txId: message.source.tx.txHash,
    asset: message.pathway.sender.name || 'USDT', // TODO: to be properly filled later
    assetType: AssetType.ERC20,
    value: '0.00001', // TODO: fix this to be properly filled later
    uniqueId: null,
    isWithdrawal: false,
    blockNum: null,
    tokenAddress: CommonAddress.Ethereum.USDT,
    isCctp: false,
    childChainId: isDeposit ? destinationChainId : sourceChainId,
    parentChainId: isDeposit ? sourceChainId : destinationChainId,
    sourceChainId,
    destinationChainId
  }
}

export async function updateAdditionalLayerZeroData(tx: MergedTransaction) {
  const { txId } = tx

  const sourceChainProvider = getProviderForChainId(tx.sourceChainId)
  const destinationChainProvider = getProviderForChainId(tx.destinationChainId)

  const sourceChainTxReceipt = await sourceChainProvider.getTransactionReceipt(
    txId
  )

  console.log('sourceChainTxReceipt', sourceChainTxReceipt)
  //   const destinationChainTxReceipt = await destinationChainProvider.getTransactionReceipt(txId)

  debugger

  return {
    ...tx,
    blockNum: sourceChainTxReceipt.blockNumber,
    tokenAddress: sourceChainTxReceipt.logs[0].address
  }
}

interface LayerZeroResponse {
  data: LayerZeroMessage[]
  pagination: {
    total: number
    page: number
    size: number
  }
}

export function useOftTransactionHistory({
  walletAddress,
  isTestnet
}: {
  walletAddress?: string
  isTestnet: boolean
}) {
  const { address } = useAccount()

  const walletAddressToFetch = walletAddress ?? address

  const fetcher = useCallback(
    async (url: string) => {
      if (!walletAddressToFetch) return null

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch OFT transaction history')
      }

      const data: LayerZeroResponse = await response.json()

      console.log('xxxx', data)

      return data.data
        .filter(validateSourceAndDestinationChainIds) // filter out transactions that don't have Arbitrum supported chain ids
        .map(mapLayerZeroMessageToMergedTransaction)
    },
    [walletAddressToFetch]
  )

  const { data, error, isLoading } = useSWR(
    walletAddressToFetch
      ? `${
          isTestnet ? LAYERZERO_API_URL_TESTNET : LAYERZERO_API_URL_MAINNET
        }/messages/wallet/${walletAddressToFetch}`
      : null,
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
