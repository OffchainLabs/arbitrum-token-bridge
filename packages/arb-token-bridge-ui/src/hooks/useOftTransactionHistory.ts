import { useCallback } from 'react'
import useSWR from 'swr'
import { BigNumber } from 'ethers'
import { AssetType, NodeBlockDeadlineStatus } from './arbTokenBridge.types'
import { DepositStatus, MergedTransaction } from '../state/app/state'
import { Address } from '../util/AddressUtils'
import { CCTPSupportedChainId } from '../state/cctpState'
import {
  TxnType,
  ParentToChildMessageData,
  ChildToParentMessageData
} from '../types/Transactions'

const LAYERZERO_API_URL = 'https://scan.layerzero-api.com/v1'

export enum LayerZeroMessageStatus {
  INFLIGHT = 'INFLIGHT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  PAYLOAD_STORED = 'PAYLOAD_STORED',
  BLOCKED = 'BLOCKED',
  CONFIRMING = 'CONFIRMING'
}

const getOftTransactionStatus = (message: LayerZeroMessage) => {
  switch (message.status.name) {
    case LayerZeroMessageStatus.INFLIGHT ||
      LayerZeroMessageStatus.CONFIRMING ||
      LayerZeroMessageStatus.PAYLOAD_STORED:
      return 'pending'
    case LayerZeroMessageStatus.DELIVERED:
      return 'pending'
    case LayerZeroMessageStatus.FAILED || LayerZeroMessageStatus.BLOCKED:
      return 'failed'
    default:
      return 'pending'
  }
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

function transformLayerZeroMessage(
  message: LayerZeroMessage
): MergedTransaction {
  const status = LayerZeroStatusToMergedTxnStatusMap[message.status.name]
  return {
    sender: message.pathway.sender.address,
    destination: message.pathway.receiver.address,
    direction: 'deposit',
    status: getOftTransactionStatus(message),
    createdAt: Math.floor(new Date(message.created).getTime() / 1000),
    resolvedAt:
      getOftTransactionStatus(message) === 'pending'
        ? null
        : Math.floor(new Date(message.updated).getTime() / 1000),
    txId: message.source.tx.txHash,
    asset: string,
    assetType: AssetType,
    value: string | null,
    value2: string,
    uniqueId: BigNumber | null,
    isWithdrawal: boolean,
    blockNum: number | null,
    tokenAddress: string | null,
    isOft: true,
    isCctp: false,
    nodeBlockDeadline: NodeBlockDeadlineStatus,
    parentToChildMsgData: ParentToChildMessageData,
    childToParentMsgData: ChildToParentMessageData,
    depositStatus: DepositStatus,
    childChainId: number,
    parentChainId: number,
    sourceChainId: number,
    destinationChainId: number
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
