import { gql } from '@apollo/client'
import { NextApiRequest, NextApiResponse } from 'next'

import {
  getL1SubgraphClient,
  getSourceFromSubgraphClient
} from '../../../api-utils/ServerSubgraphUtils'
import { getInboxAddressFromOrbitChainId } from '../../../util/orbitChainsList'
import { FetchEthTeleportsFromSubgraphResult } from '../../../util/teleports/fetchEthTeleportsFromSubgraph'

// Extending the standard NextJs request with Deposit-params
type NextApiRequestWithDepositParams = NextApiRequest & {
  query: {
    sender?: string
    receiver?: string
    l1ChainId: string
    l2ChainId: string
    l3ChainId: string
    search?: string
    page?: string
    pageSize?: string
    fromBlock?: string
    toBlock?: string
  }
}

type EthTeleportResponse = {
  meta?: { source: string | null }
  data: FetchEthTeleportsFromSubgraphResult[]
  message?: string // in case of any error
}

export default async function handler(
  req: NextApiRequestWithDepositParams,
  res: NextApiResponse<EthTeleportResponse>
) {
  try {
    const {
      sender,
      receiver,
      l1ChainId,
      l2ChainId,
      l3ChainId,
      page = '0',
      pageSize = '10'
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

    if (!l1ChainId) errorMessage.push('<l1ChainId> is required')

    if (!l2ChainId) errorMessage.push('<l2ChainId> is required')

    if (!l3ChainId) errorMessage.push('<l3ChainId> is required')

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

    let subgraphClient
    try {
      subgraphClient = getL1SubgraphClient(Number(l2ChainId))
    } catch (error: any) {
      // catch attempt to query unsupported networks and throw a 400
      res.status(400).json({
        message: error?.message ?? 'Something went wrong',
        data: []
      })
      return
    }

    const l3InboxAddress = getInboxAddressFromOrbitChainId(Number(l3ChainId))

    if (typeof l3InboxAddress === 'undefined') {
      res.status(400).json({
        message: `inbox address not found for chain-id: ${l1ChainId} -> ${l2ChainId} -> ${l3ChainId}`,
        data: []
      })
      return
    }

    const createRetryableFunctionSelector = '0x679b6ded'

    const query = `{
      retryables(
        where: {
          sender: "${sender}",
          l2Calldata_contains: "${createRetryableFunctionSelector}",
          destAddr: "${l3InboxAddress}",
        }
        first: ${Number(pageSize)}
        skip: ${Number(page) * Number(pageSize)}
        orderBy: blockCreatedAt
        orderDirection: desc
      ) {
        transactionHash
        timestamp
        blockCreatedAt
        l2Calldata
        value
        sender
        retryableTicketID
        destAddr
      }
    }
  `

    const subgraphResult = await subgraphClient.query({
      query: gql(query)
    })

    const transactions: FetchEthTeleportsFromSubgraphResult[] =
      subgraphResult.data.retryables.map(
        (retryable: FetchEthTeleportsFromSubgraphResult) => ({
          ...retryable,
          l3ChainId
        })
      )

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
