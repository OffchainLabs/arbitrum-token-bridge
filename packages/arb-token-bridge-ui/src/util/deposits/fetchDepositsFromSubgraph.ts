import { SubgraphQueryTypes } from '../SubgraphUtils'
import { getAPIBaseUrl, sanitizeQueryParams } from './../index'

export type FetchDepositsFromSubgraphResult = {
  receiver: string
  sender: string
  sequenceNumber: string
  timestamp: string
  transactionHash: string
  type: 'EthDeposit' | 'TokenDeposit'
  isClassic: boolean
  id: string
  ethValue: string
  tokenAmount?: string
  blockCreatedAt: string
  l1Token?: {
    symbol: string
    decimals: number
    id: string
    name: string
    registeredAtBlock: string
  }
  subgraphQueryType: SubgraphQueryTypes
}

/**
 * Fetches initiated deposits (ETH + Tokens) from subgraph in range of [fromBlock, toBlock] and pageParams.
 *
 * @param query Query params
 * @param query.address Account address
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2ChainId Chain id for the L2 network
 * @param query.pageSize Fetch these many records from subgraph
 * @param query.pageNumber Fetch records starting [pageNumber * pageSize] records
 * @param query.searchString Searches records through the l1TxHash
 */

export const fetchDepositsFromSubgraph = async ({
  queryType,
  sender,
  senderNot,
  receiver,
  receiverNot,
  fromBlock,
  toBlock,
  l2ChainId,
  pageSize = 10,
  totalFetched = 0,
  searchString = ''
}: {
  queryType: SubgraphQueryTypes
  sender?: string
  senderNot?: string
  receiver?: string
  receiverNot?: string
  fromBlock: number
  toBlock: number
  l2ChainId: number
  pageSize?: number
  totalFetched?: number
  searchString?: string
}): Promise<FetchDepositsFromSubgraphResult[]> => {
  if (fromBlock >= toBlock) {
    // if fromBlock > toBlock or both are equal / 0
    return []
  }

  const urlParams = new URLSearchParams(
    sanitizeQueryParams({
      sender,
      senderNot,
      receiver,
      receiverNot,
      fromBlock,
      toBlock,
      l2ChainId,
      pageSize,
      totalFetched,
      search: searchString
    })
  )

  function getAPISubgraphQueryType() {
    if (
      [SubgraphQueryTypes.TxSent, SubgraphQueryTypes.TxReceived].includes(
        queryType
      )
    ) {
      return 'deposits'
    }
    return 'retryables'
  }

  const response = await fetch(
    `${getAPIBaseUrl()}/api/${getAPISubgraphQueryType()}?${urlParams}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  )

  const transactions: FetchDepositsFromSubgraphResult[] = (
    await response.json()
  ).data

  return transactions
}
