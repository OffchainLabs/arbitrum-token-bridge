import { gql } from '@apollo/client'
import { getL1SubgraphClient } from '../util/subgraph'

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
    decimals: string
    id: string
    name: string
    registeredAtBlock: string
  }
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
  fromBlock?: number
  toBlock?: number
  l2ChainId: number
  pageSize?: number
  pageNumber?: number
  searchString?: string
}): Promise<FetchDepositsFromSubgraphResult[]> => {
  if (fromBlock === 0 && toBlock === 0) {
    return []
  }

  const res = await getL1SubgraphClient(l2ChainId).query({
    query: gql`{
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
          receiver
          sender
          sequenceNumber
          timestamp
          tokenAmount
          transactionHash
          type
          isClassic
          id
          ethValue
          blockCreatedAt
          l1Token {
            symbol
            decimals    
            id
            name
            registeredAtBlock
          }                  
        }
      }
    `
  })

  const transactions: FetchDepositsFromSubgraphResult[] = res.data.deposits.map(
    (tx: FetchDepositsFromSubgraphResult) => {
      const {
        receiver,
        sender,
        sequenceNumber,
        timestamp,
        tokenAmount,
        transactionHash,
        type,
        isClassic,
        id,
        ethValue,
        blockCreatedAt,
        l1Token
      } = tx

      return {
        receiver,
        sender,
        sequenceNumber,
        timestamp,
        tokenAmount,
        transactionHash,
        type,
        isClassic,
        id,
        ethValue,
        blockCreatedAt,
        l1Token: {
          id: l1Token?.id,
          symbol: l1Token?.symbol
        }
      }
    }
  )

  return transactions
}
