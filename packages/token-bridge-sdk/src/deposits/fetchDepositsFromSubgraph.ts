import axios from 'axios'

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

  // if dev environment, eg. tests, then prepend localhost
  // relative path api/deposits won't be accessible here because it is present in different NextJs package <token-bridge-ui>
  // Resolves: next-js-error-only-absolute-urls-are-supported in test:ci:sdk
  const baseUrl =
    window.location.origin.indexOf('localhost') > -1
      ? 'http://localhost:3000'
      : window.location.origin

  const response = await axios.get(`${baseUrl}/api/deposits`, {
    params: {
      address,
      fromBlock,
      toBlock,
      l2ChainId,
      pageSize,
      page: pageNumber,
      search: searchString
    },
    headers: { 'Content-Type': 'application/json' }
  })

  const transactions: FetchDepositsFromSubgraphResult[] = (await response.data)
    .data

  return transactions
}
