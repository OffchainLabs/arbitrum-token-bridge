import { NextApiRequest, NextApiResponse } from 'next'
import { gql } from '@apollo/client'
import {
  FetchDepositsFromSubgraphResult,
  getL1SubgraphClient
} from 'token-bridge-sdk'

// Extending the standard NextJs request with Deposit-params
type NextApiRequestWithDepositParams = NextApiRequest & {
  body: {
    l2ChainId: number
    address?: string
    search?: string
    page?: number
    pageSize?: number
    fromBlock?: number
    toBlock?: number
  }
}

// Standard response design inspired by https://github.com/omniti-labs/jsend
type DepositsResponse = {
  status: 'success' | 'error'
  data: FetchDepositsFromSubgraphResult[]
  message?: string
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
      page = 0,
      pageSize = 10,
      fromBlock,
      toBlock
    } = req.body

    if (!l2ChainId) {
      res.status(400).json({
        status: 'error',
        message: 'Incomplete request: <l2ChainId> is required',
        data: []
      })

      return
    }

    const subgraphResult = await getL1SubgraphClient(l2ChainId).query({
      query: gql`{
        deposits(
          where: {
            
            ${typeof address !== 'undefined' ? `sender: "${address}"` : ''}
            
            ${
              typeof fromBlock !== 'undefined'
                ? `blockCreatedAt_gte: ${fromBlock}`
                : ''
            }
            ${
              typeof toBlock !== 'undefined'
                ? `blockCreatedAt_lte: ${toBlock}`
                : ''
            }
  
            ${search ? `transactionHash_contains: "${search}"` : ''}
          }
          orderBy: blockCreatedAt
          orderDirection: desc
          first: ${pageSize},
          skip: ${page * pageSize}
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

    res.status(200).json({ status: 'success', data: transactions })
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error?.message ?? 'Something went wrong',
      data: []
    })
  }
}
