import { useCallback } from 'react'
import useSWRImmutable from 'swr/immutable'
import { AssetType } from './arbTokenBridge.types'
import { MergedTransaction } from '../state/app/state'
import { getChainIdFromEid } from '../token-bridge-sdk/oftUtils'
import { isDepositMode } from '../util/isDepositMode'
import { useAccount } from 'wagmi'
import { getProviderForChainId } from '../token-bridge-sdk/utils'
import { fetchErc20Data } from '../util/TokenUtils'
import { decodeFunctionData, formatUnits, toHex } from 'viem'
import { isNetwork } from '../util/networks'
import { oftV2Abi } from '../token-bridge-sdk/oftV2Abi'

const LAYERZERO_API_URL_MAINNET = 'https://scan.layerzero-api.com/v1'
const LAYERZERO_API_URL_TESTNET = 'https://scan-testnet.layerzero-api.com/v1'

export const LayerZeroMessageStatus = {
  INFLIGHT: 'pending',
  CONFIRMING: 'pending',
  PAYLOAD_STORED: 'pending',
  DELIVERED: 'success',
  FAILED: 'failed',
  BLOCKED: 'failed'
} as const
/*
 * LayerZero API returns `LayerZeroTransaction` without `asset` and `value`.
 * `updateAdditionalLayerZeroData()` fills these gaps, returning `MergedTransaction` for tx history.
 */
export type LayerZeroTransaction = Omit<
  MergedTransaction,
  'asset' | 'value' | 'tokenAddress'
> & {
  isOft: true
}

/**
 * Response of LayerZero API for a wallet address
 *
 * Example of this can be found at: https://scan.layerzero-api.com/v1/swagger > /messages/wallet/{srcAddress}
 * eg: https://scan.layerzero-api.com/v1/messages/wallet/0x0000000000000000000000000000000000000000
 */
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
  return (
    LayerZeroMessageStatus[
      message.status.name as keyof typeof LayerZeroMessageStatus
    ] ?? 'pending'
  )
}

function validateSourceAndDestinationChainIds(message: LayerZeroMessage) {
  const sourceChainId = getChainIdFromEid(message.pathway.srcEid)
  const destinationChainId = getChainIdFromEid(message.pathway.dstEid)

  return sourceChainId && destinationChainId
}

function mapLayerZeroMessageToMergedTransaction(
  message: LayerZeroMessage
): LayerZeroTransaction {
  const sourceChainId = getChainIdFromEid(message.pathway.srcEid)
  const destinationChainId = getChainIdFromEid(message.pathway.dstEid)

  if (!sourceChainId || !destinationChainId) {
    throw new Error('Invalid chain ids')
  }

  const isDeposit = isDepositMode({
    sourceChainId,
    destinationChainId
  })

  const destinationTxHash = message.destination?.tx?.txHash || null

  return {
    isOft: true,
    isCctp: false,
    sender: message.source.tx.from,
    direction: isDeposit ? 'deposit' : 'withdraw',
    status: getOftTransactionStatus(message),
    createdAt: new Date(message.created).getTime(),
    resolvedAt:
      getOftTransactionStatus(message) === 'pending'
        ? null
        : new Date(message.updated).getTime(),
    txId: message.source.tx.txHash.toLowerCase(),
    assetType: AssetType.ERC20,
    uniqueId: null,
    isWithdrawal: !isDeposit,
    blockNum: null,
    childChainId: isDeposit ? destinationChainId : sourceChainId,
    parentChainId: isDeposit ? sourceChainId : destinationChainId,
    sourceChainId,
    destinationChainId,
    oftData: {
      destinationTxHash
    }
  }
}

export async function updateAdditionalLayerZeroData(
  tx: LayerZeroTransaction
): Promise<MergedTransaction> {
  const { txId } = tx
  const updatedTx = { ...tx }

  const sourceChainProvider = getProviderForChainId(tx.sourceChainId)

  // extract destination address
  const sourceChainTx = await sourceChainProvider.getTransaction(txId)
  const decodedInputData = decodeFunctionData({
    abi: oftV2Abi,
    data: sourceChainTx.data as `0x${string}`
  })
  if (decodedInputData.functionName !== 'send') {
    throw new Error('Expected `send()` function in ABI')
  }
  updatedTx.destination = toHex(decodedInputData.args[0].to)

  // extract token and value
  const sourceChainTxReceipt = await sourceChainProvider.getTransactionReceipt(
    txId
  )
  const tokenAddress = sourceChainTxReceipt.logs[0]?.address

  if (!tokenAddress) {
    throw new Error('No token address found for OFT transaction')
  }

  const { symbol } = await fetchErc20Data({
    address: tokenAddress,
    provider: sourceChainProvider
  })

  const transferLog = sourceChainTxReceipt.logs[0]
  if (!transferLog) {
    throw new Error('No transfer log found')
  }

  const transferInterface = {
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256' }
    ]
  }
  const decodedTransferLogs = decodeFunctionData({
    abi: [transferInterface],
    data: transferLog.data as `0x${string}`
  })
  if (!decodedTransferLogs.args || !('value' in decodedTransferLogs.args)) {
    throw new Error('Invalid transfer log data')
  }

  const { decimals } = await fetchErc20Data({
    address: tokenAddress,
    provider: sourceChainProvider
  })

  return {
    ...updatedTx,
    asset: symbol,
    tokenAddress,
    value: formatUnits(decodedTransferLogs.args.value as bigint, decimals),
    blockNum: sourceChainTxReceipt.blockNumber
  } as MergedTransaction
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

      return data.data
        .filter(validateSourceAndDestinationChainIds) // filter out transactions that don't have Arbitrum supported chain ids
        .map(mapLayerZeroMessageToMergedTransaction)
    },
    [walletAddressToFetch]
  )

  const { data, error, isLoading } = useSWRImmutable(
    walletAddressToFetch
      ? `${
          isTestnet ? LAYERZERO_API_URL_TESTNET : LAYERZERO_API_URL_MAINNET
        }/messages/wallet/${walletAddressToFetch}`
      : null,
    fetcher
  )

  return {
    transactions: data || [],
    error,
    isLoading
  }
}

export async function getUpdatedOftTransfer(
  tx: MergedTransaction
): Promise<MergedTransaction> {
  const isTestnetTransfer = [tx.sourceChainId, tx.destinationChainId].some(
    chainId => isNetwork(chainId).isTestnet
  )
  const LAYERZERO_API_URL = isTestnetTransfer
    ? LAYERZERO_API_URL_TESTNET
    : LAYERZERO_API_URL_MAINNET

  const url = `${LAYERZERO_API_URL}/messages/tx/${tx.txId}`
  try {
    const response = await fetch(url)
    const message = (await response.json()).data[0] as LayerZeroMessage
    const status = getOftTransactionStatus(message)

    const destinationTxHash = message.destination?.tx?.txHash || null

    return {
      ...tx,
      status,
      resolvedAt:
        status === 'pending' ? null : new Date(message.updated).getTime(),
      oftData: {
        destinationTxHash
      }
    }
  } catch (error) {
    console.error('Error fetching updated OFT transfer for tx:', tx.txId, error)
    return tx
  }
}
