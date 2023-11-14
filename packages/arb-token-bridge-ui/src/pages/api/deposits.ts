import { NextApiRequest, NextApiResponse } from 'next'
import { gql } from '@apollo/client'
import { FetchDepositsFromSubgraphResult } from '../../util/deposits/fetchDepositsFromSubgraph'
import { getL1SubgraphClient } from '../../util/SubgraphUtils'

// Extending the standard NextJs request with Deposit-params
type NextApiRequestWithDepositParams = NextApiRequest & {
  query: {
    sender?: string
    receiver?: string
    l2ChainId: string
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
      sender,
      receiver,
      search = '',
      l2ChainId,
      page = '0',
      pageSize = '10',
      fromBlock,
      toBlock
    } = req.query

    // validate method
    if (req.method !== 'GET') {
      res
        .status(400)
        .send({ message: `invalid_method: ${req.method}`, data: [] })
      return
    }

    // validate the request parameters
    const errorMessage = []
    if (!l2ChainId) errorMessage.push('<l2ChainId> is required')
    if (!sender && !receiver)
      errorMessage.push('<sender> or <receiver> is required')

    if (errorMessage.length) {
      res.status(400).json({
        message: `incomplete request: ${errorMessage.join(', ')}`,
        data: []
      })
    }

    const additionalFilters = `${
      typeof fromBlock !== 'undefined'
        ? `blockCreatedAt_gte: ${Number(fromBlock)},`
        : ''
    }
    ${
      typeof toBlock !== 'undefined'
        ? `blockCreatedAt_lte: ${Number(toBlock)},`
        : ''
    }
    ${search ? `transactionHash_contains: "${search}"` : ''}
    `

    const subgraphResult = await getL1SubgraphClient(Number(l2ChainId)).query({
      query: gql(`{
        deposits(
          where: {            
            or: [
              ${sender ? `{ sender: "${sender}", ${additionalFilters} },` : ''}
              ${
                receiver
                  ? `{ receiver: "${receiver}", ${additionalFilters} },`
                  : ''
              }
            ]
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
    `)
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
