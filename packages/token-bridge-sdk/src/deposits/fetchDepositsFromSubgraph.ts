import { gql } from '@apollo/client'
import { getL1SubgraphClient } from '../util/subgraph'
import { Provider } from '@ethersproject/providers'

export type FetchDepositsFromSubgraphResult = {
  id: string
  type: string
  sender: string
  receiver: string
  ethValue: string
  l1Token: {
    id: string
  }
  sequenceNumber: string
  tokenAmount: string
  isClassic: boolean
  timestamp: number
  transactionHash: string
  blockCreatedAt: string
}

export const fetchDepositsFromSubgraph = async ({
  address,
  fromBlock,
  toBlock,
  l1Provider,
  l2Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: {
  address: string
  fromBlock?: number
  toBlock?: number
  l1Provider: Provider
  l2Provider: Provider
  pageSize?: number
  pageNumber?: number
  searchString?: string
}): Promise<FetchDepositsFromSubgraphResult[]> => {
  const l2ChainId = (await l2Provider.getNetwork()).chainId

  if (fromBlock === 0 && toBlock === 0) {
    return []
  }

  const res = await getL1SubgraphClient(l2ChainId).query({
    query: gql`
      {
        deposits(
          where: {
            sender: "${address}",
            blockCreatedAt_gte: ${fromBlock},
            blockCreatedAt_lte: ${toBlock}
            ${searchString ? `transactionHash_contains: "${searchString}"` : ''}
          }
          orderBy: blockCreatedAt
          orderDirection: desc
          first: ${pageSize},
          skip: ${pageNumber * pageSize}
        ) {
          id
          type
          sender
          receiver
          ethValue
          l1Token {
            id
          }
          sequenceNumber
          tokenAmount
          isClassic
          timestamp
          transactionHash
          blockCreatedAt
        }
      }
    `
  })

  const depositsFromSubgraph = res.data.deposits.map(
    (tx: FetchDepositsFromSubgraphResult) => tx
  )

  return depositsFromSubgraph
}
