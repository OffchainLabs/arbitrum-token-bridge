import { gql } from '@apollo/client'
import { NextApiRequest, NextApiResponse } from 'next'

import {
  getSourceFromSubgraphClient,
  getTeleporterSubgraphClient
} from '../../../api-utils/ServerSubgraphUtils'
import { FetchErc20TeleportsFromSubgraphResult } from '../../../util/teleports/fetchErc20TeleportsFromSubgraph'

// Extending the standard NextJs request with Deposit-params
type NextApiRequestWithErc20TeleportParams = NextApiRequest & {
  query: {
    sender?: string
    l1ChainId: string
    page?: string
    pageSize?: string
  }
}

type Erc20TeleportResponse = {
  meta?: { source: string | null }
  data: FetchErc20TeleportsFromSubgraphResult[]
  message?: string // in case of any error
}

export default async function handler(
  req: NextApiRequestWithErc20TeleportParams,
  res: NextApiResponse<Erc20TeleportResponse>
) {
  try {
    const { sender, l1ChainId, page = '0', pageSize = '10' } = req.query

    // validate method
    if (req.method !== 'GET') {
      res
        .status(400)
        .send({ message: `invalid_method: ${req.method}`, data: [] })
      return
    }

    // validate the request parameters
    const errorMessage = []
    if (!l1ChainId) errorMessage.push('<l1ChainId> is required')
    if (!sender) errorMessage.push('<sender> is required')

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

    let subgraphClient
    try {
      subgraphClient = getTeleporterSubgraphClient(Number(l1ChainId))
    } catch (error: any) {
      // catch attempt to query unsupported networks and throw a 400
      res.status(400).json({
        message: error?.message ?? 'Something went wrong',
        data: []
      })
      return
    }

    const subgraphResult = await subgraphClient.query({
      query: gql(`{
        teleporteds(
          where: {
            sender: "${sender}"           
          }
          first: ${Number(pageSize)}
          skip: ${Number(page) * Number(pageSize)}
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          sender
          l1Token
          l3FeeTokenL1Addr
          l1l2Router
          l2l3RouterOrInbox
          to
          amount
          transactionHash
          timestamp
        }
      }`)
    })

    const transactions: FetchErc20TeleportsFromSubgraphResult[] =
      subgraphResult.data.teleporteds

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
