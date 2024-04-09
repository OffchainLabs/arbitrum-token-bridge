import { getL1SubgraphClient } from '../SubgraphUtils'
import { getAPIBaseUrl, sanitizeQueryParams } from './../index'
import { FetchDepositsFromSubgraphResult } from '../../pages/api/deposits'

/**
 * Fetches initiated deposits (ETH + Tokens) from subgraph in range of [fromBlock, toBlock] and pageParams.
 *
 * @param query Query params
 * @param query.sender Address that initiated the withdrawal
 * @param query.receiver Address that received the funds
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2ChainId Chain id for the L2 network
 * @param query.pageSize Fetch these many records from subgraph
 * @param query.pageNumber Fetch records starting [pageNumber * pageSize] records
 * @param query.searchString Searches records through the l1TxHash
 */

export const fetchDepositsFromSubgraph = async ({
  sender,
  receiver,
  fromBlock,
  toBlock,
  l2ChainId,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: {
  sender?: string
  receiver?: string
  fromBlock: number
  toBlock?: number
  l2ChainId: number
  pageSize?: number
  pageNumber?: number
  searchString?: string
}): Promise<FetchDepositsFromSubgraphResult[]> => {
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
      l2ChainId,
      pageSize,
      page: pageNumber,
      search: searchString
    })
  )

  // don't call API if trying to query an unsupported network
  try {
    getL1SubgraphClient(Number(l2ChainId))
  } catch (error: any) {
    throw error
  }

  if (pageSize === 0) return [] // don't query subgraph if nothing requested

  const response = await fetch(`${getAPIBaseUrl()}/api/deposits?${urlParams}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  const transactions: FetchDepositsFromSubgraphResult[] = (
    await response.json()
  ).data

  return transactions
}
