import { NextApiRequest, NextApiResponse } from 'next'
import { gql } from '@apollo/client'

import { FetchWithdrawalsFromSubgraphResult } from '../../util/withdrawals/fetchWithdrawalsFromSubgraph'
import {
  getL2SubgraphClient,
  getSourceFromSubgraphClient
} from '../../api-utils/ServerSubgraphUtils'

// Extending the standard NextJs request with Withdrawal-params
type NextApiRequestWithWithdrawalParams = NextApiRequest & {
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

type WithdrawalResponse = {
  meta?: { source: string | null }
  data: FetchWithdrawalsFromSubgraphResult[]
  message?: string // in case of any error
}

export default async function handler(
  req: NextApiRequestWithWithdrawalParams,
  res: NextApiResponse<WithdrawalResponse>
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
        ? `l2BlockNum_gte: ${Number(fromBlock)},`
        : ''
    }
    ${
      typeof toBlock !== 'undefined'
        ? `l2BlockNum_lte: ${Number(toBlock)},`
        : ''
    }
    ${search ? `l2TxHash_contains: "${search}"` : ''}
    `

    let subgraphClient
    try {
      subgraphClient = getL2SubgraphClient(Number(l2ChainId))
    } catch (error: any) {
      // catch attempt to query unsupported networks and throw a 400
      res.status(400).json({
        message: error?.message ?? 'Something went wrong',
        data: []
      })
      return
    }

    const subgraphResult = await subgraphClient.query({
      query: gql`{
        withdrawals(
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
          orderBy: l2BlockTimestamp
          orderDirection: desc
          first: ${Number(pageSize)},
          skip: ${Number(page) * Number(pageSize)}
        ) {
          id,
          type,
          sender,
          receiver,
          ethValue,
          l1Token {
            id
          },
          tokenAmount,
          isClassic,
          l2BlockTimestamp,
          l2TxHash,
          l2BlockNum
        }
    }`
    })

    const transactions: FetchWithdrawalsFromSubgraphResult[] =
      subgraphResult.data.withdrawals.map((eventData: any) => {
        const {
          id,
          type,
          sender,
          receiver,
          ethValue,
          l1Token,
          tokenAmount,
          isClassic,
          l2BlockTimestamp,
          l2TxHash,
          l2BlockNum
        } = eventData

        return {
          id,
          type,
          sender,
          receiver,
          ethValue,
          l1Token,
          tokenAmount,
          isClassic,
          l2BlockTimestamp,
          l2TxHash,
          l2BlockNum
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
