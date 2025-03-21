import { useCallback } from 'react'
import useSWR from 'swr'
import { AssetType } from './arbTokenBridge.types'
import { MergedTransaction } from '../state/app/state'
import { getChainIdFromEid } from '../token-bridge-sdk/oftUtils'
import { isDepositMode } from '../util/isDepositMode'
import { useAccount } from 'wagmi'
import { getProviderForChainId } from '../token-bridge-sdk/utils'
import { fetchErc20Data } from '../util/TokenUtils'
import { ethers, utils } from 'ethers'
import { isNetwork } from '../util/networks'

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
    txId: message.source.tx.txHash,
    assetType: AssetType.ERC20,
    uniqueId: null,
    isWithdrawal: false,
    blockNum: null,
    childChainId: isDeposit ? destinationChainId : sourceChainId,
    parentChainId: isDeposit ? sourceChainId : destinationChainId,
    sourceChainId,
    destinationChainId
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
  const inputDataInterface = new ethers.utils.Interface([
    'function send((uint32,bytes32,uint256,uint256,bytes,bytes,bytes), (uint256,uint256), address)'
  ])
  const decodedInputData = inputDataInterface.decodeFunctionData(
    'send',
    sourceChainTx.data
  )
  updatedTx.destination = utils.hexValue(decodedInputData[0][1])

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

  const transferInterface = new ethers.utils.Interface([
    'event Transfer(address indexed from, address indexed to, uint value)'
  ])
  const decodedTransferLogs = transferInterface.parseLog(
    sourceChainTxReceipt.logs[0]!
  )
  const { decimals } = await fetchErc20Data({
    address: tokenAddress,
    provider: sourceChainProvider
  })

  return {
    ...updatedTx,
    asset: symbol,
    tokenAddress,
    value: ethers.utils
      .formatUnits(decodedTransferLogs.args.value, decimals)
      .toString(),
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
    return {
      ...tx,
      status: getOftTransactionStatus(message),
      resolvedAt:
        getOftTransactionStatus(message) === 'pending'
          ? null
          : new Date(message.updated).getTime()
    }
  } catch (error) {
    console.error('Error fetching updated OFT transfer for tx:', tx.txId, error)
    return tx
  }
}
