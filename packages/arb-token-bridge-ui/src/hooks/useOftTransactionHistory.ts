import { ethers, utils } from 'ethers'
import useSWRImmutable from 'swr/immutable'
import { AssetType } from './arbTokenBridge.types'
import {
  getChainIdFromEid,
  getOftV2TransferDecodedData
} from '../token-bridge-sdk/oftUtils'
import { LayerZeroTransaction } from '../state/app/state'
import { isDepositMode } from '../util/isDepositMode'
import { getProviderForChainId } from '../token-bridge-sdk/utils'
import { fetchErc20Data } from '../util/TokenUtils'
import { isNetwork } from '../util/networks'
import { CommonAddress } from '../util/CommonAddressUtils'

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

/**
 * Validate a LayerZero tx received from LzScan API: check source and destination chain ids, and double check that protocol is USDT0 (to filter out Lifi transfers routed through LayerZero)
 */
async function validateLayerZeroMessage(message: LayerZeroMessage) {
  const sourceChainId = getChainIdFromEid(message.pathway.srcEid)
  const destinationChainId = getChainIdFromEid(message.pathway.dstEid)

  const isProtocolUsdt0 = message.pathway?.sender?.id === 'usdt0'

  if (sourceChainId && destinationChainId && isProtocolUsdt0) {
    try {
      const isOftDataDecodable = !!(await getOftV2TransferDecodedData(
        message.source.tx.txHash,
        getProviderForChainId(sourceChainId)
      ))
      return isOftDataDecodable
    } catch (e) {
      // invalid oft transfer (OFT message is probably triggered by a SC/protocol (internal tx), rather than the user)
    }
  }

  return false
}

function mapLayerZeroMessageToLayerZeroTransaction(
  message: LayerZeroMessage
): LayerZeroTransaction {
  const sourceChainId = getChainIdFromEid(message.pathway.srcEid)
  const destinationChainId = getChainIdFromEid(message.pathway.dstEid)

  if (!sourceChainId) {
    throw new Error(`Invalid source chain ID: ${sourceChainId}`)
  }

  if (!destinationChainId) {
    throw new Error(`Invalid destination chain ID: ${destinationChainId}`)
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
    destinationTxHash,
    asset: 'USDT',
    value: '0',
    tokenAddress: isDeposit
      ? CommonAddress.Ethereum.USDT
      : CommonAddress.ArbitrumOne.USDT
  }
}

export async function updateAdditionalLayerZeroData(
  tx: LayerZeroTransaction
): Promise<LayerZeroTransaction> {
  const { txId } = tx
  const updatedTx = { ...tx }

  const sourceChainProvider = getProviderForChainId(tx.sourceChainId)

  // extract destination address
  const decodedInputData = await getOftV2TransferDecodedData(
    txId,
    sourceChainProvider
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

  const { symbol, decimals } = await fetchErc20Data({
    address: tokenAddress,
    provider: sourceChainProvider
  })

  const transferInterface = new ethers.utils.Interface([
    'event Transfer(address indexed from, address indexed to, uint value)'
  ])
  const decodedTransferLogs = transferInterface.parseLog(
    sourceChainTxReceipt.logs[0]!
  )

  return {
    ...updatedTx,
    asset: symbol,
    tokenAddress,
    value: ethers.utils
      .formatUnits(decodedTransferLogs.args.value, decimals)
      .toString(),
    blockNum: sourceChainTxReceipt.blockNumber
  }
}

interface LayerZeroResponse {
  data: LayerZeroMessage[]
  nextToken: 'string'
}

export function useOftTransactionHistory({
  walletAddress,
  isTestnet
}: {
  walletAddress?: string
  isTestnet: boolean
}) {
  const fetcher = async (url: string) => {
    const response = await fetch(url)

    // LayerZero API returns 404 if no transactions are found
    if (response.status === 404) {
      return []
    }

    if (!response.ok) {
      throw new Error('Failed to fetch OFT transaction history')
    }

    const layerZeroResponse: LayerZeroResponse = await response.json()

    const validMessages = await Promise.all(
      layerZeroResponse.data.map(async message => {
        const isValid = await validateLayerZeroMessage(message)
        return isValid ? message : null
      })
    ).then(results =>
      results.filter((message): message is LayerZeroMessage => message !== null)
    )

    return validMessages.map(mapLayerZeroMessageToLayerZeroTransaction)
  }

  const { data, error, isLoading } = useSWRImmutable(
    walletAddress
      ? `${
          isTestnet ? LAYERZERO_API_URL_TESTNET : LAYERZERO_API_URL_MAINNET
        }/messages/wallet/${walletAddress}`
      : null,
    fetcher,
    {
      errorRetryCount: 2
    }
  )

  return {
    transactions: data || [],
    error,
    isLoading
  }
}

export async function getUpdatedOftTransfer(
  tx: LayerZeroTransaction
): Promise<LayerZeroTransaction> {
  const isTestnetTransfer = isNetwork(tx.sourceChainId).isTestnet

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
      destinationTxHash
    }
  } catch (error) {
    console.error('Error fetching updated OFT transfer for tx:', tx.txId, error)
    return tx
  }
}
