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

const sanitizeQueryParams = (data: any) => {
  return JSON.parse(JSON.stringify(data))
}

export const fetchDepositsFromSubgraph = async ({
  address,
  fromBlock,
  toBlock,
  l2ChainId,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: {
  address: string
  fromBlock: number
  toBlock: number
  l2ChainId: number
  pageSize?: number
  pageNumber?: number
  searchString?: string
}): Promise<FetchDepositsFromSubgraphResult[]> => {
  if (fromBlock >= toBlock) {
    // if fromBlock > toBlock or both are equal / 0
    return []
  }

  // if dev environment, eg. tests, then prepend actual running environment
  // Resolves: next-js-error-only-absolute-urls-are-supported in test:ci:sdk
  const baseUrl = process.env.NODE_ENV === 'test' ? 'http://localhost:3000' : ''

  const urlParams = new URLSearchParams(
    sanitizeQueryParams({
      address,
      fromBlock,
      toBlock,
      l2ChainId,
      pageSize,
      page: pageNumber,
      search: searchString
    })
  )

  const response = await fetch(
    `${baseUrl}/api/deposits?${urlParams.toString()}`,
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
