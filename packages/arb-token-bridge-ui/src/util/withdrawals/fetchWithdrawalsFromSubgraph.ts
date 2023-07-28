import { getAPIBaseUrl, sanitizeQueryParams } from './../index'

export type FetchWithdrawalsFromSubgraphResult = {
  id: string
  type: 'EthWithdrawal' | 'TokenWithdrawal'
  sender: string
  receiver: string
  ethValue: string
  l1Token?: {
    id: string
  }
  tokenAmount: string
  isClassic: boolean
  l2BlockTimestamp: string
  l2TxHash: string
  l2BlockNum: string
}

/**
 * Fetches initiated withdrawals (ETH + Token) from subgraph in range of [fromBlock, toBlock] and pageParams.
 *
 * @param query Query params
 * @param query.address Account address
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2ChainId ChainId for the L2 network
 * @param query.pageSize Fetch these many records from subgraph
 * @param query.pageNumber Fetch records starting [pageNumber * pageSize] records
 * @param query.searchString Searches records through the l2TxHash
 */
export async function fetchWithdrawalsFromSubgraph({
  sender,
  senderNot,
  receiver,
  receiverNot,
  fromBlock,
  toBlock,
  l2ChainId,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: {
  sender?: string
  senderNot?: string
  receiver?: string
  receiverNot?: string
  fromBlock: number
  toBlock: number
  l2ChainId: number
  pageSize?: number
  pageNumber?: number
  searchString?: string
}): Promise<FetchWithdrawalsFromSubgraphResult[]> {
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
      page: pageNumber,
      search: searchString
    })
  )

  const response = await fetch(
    `${getAPIBaseUrl()}/api/withdrawals?${urlParams}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  )

  const transactions: FetchWithdrawalsFromSubgraphResult[] = (
    await response.json()
  ).data

  return transactions
}
