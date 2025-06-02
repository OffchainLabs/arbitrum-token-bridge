import { getAPIBaseUrl, sanitizeQueryParams } from '../index'
import { hasTeleporterSubgraph } from '../SubgraphUtils'

export type FetchErc20TeleportsFromSubgraphResult = {
  id: string
  sender: string
  l1Token: string
  l3FeeTokenL1Addr: string
  l1l2Router: string
  l2l3RouterOrInbox: string
  to: string
  amount: string
  transactionHash: string
  timestamp: string
  teleport_type: 'erc20'
  parentChainId: string
}

/**
 * Fetches initiated ETH Teleports from subgraph in range of [fromBlock, toBlock] and pageParams.
 *
 * @param query Query params
 * @param query.sender Address that initiated the teleport
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l1ChainId Chain id for the L2 network
 * @param query.pageSize Fetch these many records from subgraph
 * @param query.pageNumber Fetch records starting [pageNumber * pageSize] records
 */

export const fetchErc20TeleportsFromSubgraph = async ({
  sender,
  fromBlock,
  toBlock,
  l1ChainId,
  pageSize = 10,
  pageNumber = 0
}: {
  sender?: string
  fromBlock: number
  toBlock?: number
  l1ChainId: number
  pageSize?: number
  pageNumber?: number
}): Promise<FetchErc20TeleportsFromSubgraphResult[]> => {
  if (toBlock && fromBlock >= toBlock) {
    // if fromBlock > toBlock or both are equal / 0
    return []
  }

  const urlParams = new URLSearchParams(
    sanitizeQueryParams({
      sender,
      l1ChainId,
      pageSize,
      page: pageNumber
    })
  )

  if (!hasTeleporterSubgraph(Number(l1ChainId))) {
    throw new Error(
      `Teleporter subgraph not available for network: ${l1ChainId}`
    )
  }

  if (pageSize === 0) return [] // don't query subgraph if nothing requested

  const response = await fetch(
    `${getAPIBaseUrl()}/api/teleports/erc20?${urlParams}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  )

  const transactions: FetchErc20TeleportsFromSubgraphResult[] = (
    await response.json()
  ).data

  return transactions.map(tx => ({
    ...tx,
    parentChainId: String(l1ChainId),
    teleport_type: 'erc20'
  }))
}
