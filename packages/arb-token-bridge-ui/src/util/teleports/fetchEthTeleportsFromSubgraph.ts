import { isValidTeleportChainPair } from '../../token-bridge-sdk/teleport'
import { getAPIBaseUrl, sanitizeQueryParams } from '../index'
import { hasL1Subgraph } from '../SubgraphUtils'

export type FetchEthTeleportsFromSubgraphResult = {
  transactionHash: string
  timestamp: string
  blockCreatedAt: string
  l2Calldata: string
  value: string
  sender: string
  retryableTicketID: string
  destAddr: string
  parentChainId: string
  childChainId: string // l3 chain id
  teleport_type: 'eth'
}

/**
 * Fetches initiated ETH Teleports from subgraph in range of [fromBlock, toBlock] and pageParams.
 *
 * @param query Query params
 * @param query.sender Address that initiated the teleport
 * @param query.receiver Address that received the funds
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2ChainId Chain id for the L2 network
 * @param query.pageSize Fetch these many records from subgraph
 * @param query.pageNumber Fetch records starting [pageNumber * pageSize] records
 * @param query.searchString Searches records through the l1TxHash
 */

export const fetchEthTeleportsFromSubgraph = async ({
  sender,
  receiver,
  fromBlock,
  toBlock,
  l1ChainId,
  l2ChainId,
  l3ChainId,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: {
  sender?: string
  receiver?: string
  fromBlock: number
  toBlock?: number
  l1ChainId: number
  l2ChainId: number
  l3ChainId: number
  pageSize?: number
  pageNumber?: number
  searchString?: string
}): Promise<FetchEthTeleportsFromSubgraphResult[]> => {
  if (toBlock && fromBlock >= toBlock) {
    // if fromBlock > toBlock or both are equal / 0
    return []
  }

  const urlParams = new URLSearchParams(
    sanitizeQueryParams({
      sender,
      receiver,
      fromBlock,
      toBlock,
      l1ChainId,
      l2ChainId,
      l3ChainId,
      pageSize,
      page: pageNumber,
      search: searchString
    })
  )

  if (!hasL1Subgraph(Number(l2ChainId))) {
    throw new Error(`L1 subgraph not available for network: ${l2ChainId}`)
  }

  if (pageSize === 0) return [] // don't query subgraph if nothing requested

  // don't query if not a valid teleport configuration
  if (
    !isValidTeleportChainPair({
      sourceChainId: Number(l1ChainId),
      destinationChainId: Number(l3ChainId)
    })
  ) {
    throw new Error(
      `Invalid teleport source and destination chain id: ${l1ChainId} -> ${l3ChainId}`
    )
  }

  const response = await fetch(
    `${getAPIBaseUrl()}/api/teleports/eth?${urlParams}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  )

  const transactions: FetchEthTeleportsFromSubgraphResult[] = (
    await response.json()
  ).data

  return transactions.map(tx => ({
    ...tx,
    parentChainId: String(l1ChainId),
    childChainId: String(l3ChainId),
    teleport_type: 'eth'
  }))
}
