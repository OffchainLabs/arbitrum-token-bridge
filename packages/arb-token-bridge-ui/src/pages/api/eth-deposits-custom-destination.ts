import { gql } from '@apollo/client'
import { NextApiRequest, NextApiResponse } from 'next'

import {
  getL1SubgraphClient,
  getSourceFromSubgraphClient
} from '../../api-utils/ServerSubgraphUtils'
import { FetchEthDepositsToCustomDestinationFromSubgraphResult } from '../../util/deposits/fetchEthDepositsToCustomDestinationFromSubgraph'

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

type RetryableFromSubgraph = {
  destAddr: string
  sender: string
  timestamp: string
  transactionHash: string
  id: string
  l2Callvalue: string
  blockCreatedAt: string
}

type EthDepositsToCustomDestinationResponse = {
  meta?: { source: string | null }
  data: FetchEthDepositsToCustomDestinationFromSubgraphResult[]
  message?: string
}

export default async function handler(
  req: NextApiRequestWithDepositParams,
  res: NextApiResponse<EthDepositsToCustomDestinationResponse>
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

    if (req.method !== 'GET') {
      res
        .status(400)
        .send({ message: `invalid_method: ${req.method}`, data: [] })
      return
    }

    const errorMessage = []
    if (!l2ChainId) errorMessage.push('<l2ChainId> is required')
    if (!sender && !receiver)
      errorMessage.push('<sender> or <receiver> is required')

    if (errorMessage.length) {
      res.status(400).json({
        message: `incomplete request: ${errorMessage.join(', ')}`,
        data: []
      })
      return
    }

    // if invalid pageSize, send empty data instead of error
    if (isNaN(Number(pageSize)) || Number(pageSize) === 0) {
      res.status(200).json({
        data: []
      })
      return
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
    ${search ? `transactionHash_contains: "${search}",` : ''}
    l2Callvalue_gt: 0
    l2Calldata: "0x"
    `

    const subgraphClient = getL1SubgraphClient(Number(l2ChainId))

    const subgraphResult = await subgraphClient.query({
      query: gql(`{
        retryables(
          where: {            
            or: [
              ${sender ? `{ sender: "${sender}", ${additionalFilters} },` : ''}
              ${
                receiver
                  ? `{ destAddr: "${receiver}", ${additionalFilters} },`
                  : ''
              }
            ]
          }
          orderBy: blockCreatedAt
          orderDirection: desc
          first: ${Number(pageSize)},
          skip: ${Number(page) * Number(pageSize)}
        ) {
          destAddr
          sender
          timestamp
          transactionHash
          id
          l2Callvalue
          blockCreatedAt
        }
      }`)
    })

    const retryablesFromSubgraph: RetryableFromSubgraph[] =
      subgraphResult.data.retryables

    const transactions: FetchEthDepositsToCustomDestinationFromSubgraphResult[] =
      retryablesFromSubgraph.map(retryable => {
        return {
          receiver: retryable.destAddr,
          sender: retryable.sender,
          timestamp: retryable.timestamp,
          transactionHash: retryable.transactionHash,
          type: 'EthDeposit',
          isClassic: false,
          id: retryable.id,
          ethValue: retryable.l2Callvalue,
          blockCreatedAt: retryable.blockCreatedAt
        }
      })

    res.status(200).json({
      meta: { source: getSourceFromSubgraphClient(subgraphClient) },
      data: transactions
    })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: []
    })
  }
}
