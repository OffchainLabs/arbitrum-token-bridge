import { NextApiRequest, NextApiResponse } from 'next'
import { gql } from '@apollo/client'
import {
  FetchDepositsFromSubgraphResult,
  getL1SubgraphClient
} from 'token-bridge-sdk'

// Extending the standard NextJs request with Deposit-params
type NextApiRequestWithDepositParams = NextApiRequest & {
  query: {
    l2ChainId: string
    address?: string
    search?: string
    page?: string
    pageSize?: string
    fromBlock?: string
    toBlock?: string
  }
}

type DepositsResponse = {
  data: FetchDepositsFromSubgraphResult[]
  message?: string // in case of any error
}

export default async function handler(
  req: NextApiRequestWithDepositParams,
  res: NextApiResponse<DepositsResponse>
) {
  try {
    const {
      address,
      search = '',
      l2ChainId,
      page = '0',
      pageSize = '10',
      fromBlock,
      toBlock
    } = req.query

    if (!l2ChainId) {
      res.status(400).json({
        message: 'Incomplete request: <l2ChainId> is required',
        data: []
      })

      return
    }

    const subgraphResult = await getL1SubgraphClient(Number(l2ChainId)).query({
      query: gql`{
        deposits(
          where: {
            
            ${typeof address !== 'undefined' ? `sender: "${address}"` : ''}
            
            ${
              typeof fromBlock !== 'undefined'
                ? `blockCreatedAt_gte: ${Number(fromBlock)}`
                : ''
            }
            ${
              typeof toBlock !== 'undefined'
                ? `blockCreatedAt_lte: ${Number(toBlock)}`
                : ''
            }
  
            ${search ? `transactionHash_contains: "${search}"` : ''}
          }
          orderBy: blockCreatedAt
          orderDirection: desc
          first: ${Number(pageSize)},
          skip: ${Number(page) * Number(pageSize)}
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

    const transactions: FetchDepositsFromSubgraphResult[] =
      subgraphResult.data.deposits

    res.status(200).json({ data: transactions })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: []
    })
  }
}
