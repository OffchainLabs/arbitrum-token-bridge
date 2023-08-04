import { NextApiRequest, NextApiResponse } from 'next'
import { gql } from '@apollo/client'
import { FetchDepositsFromSubgraphResult } from '../../util/deposits/fetchDepositsFromSubgraph'
import {
  SubgraphQueryTypes,
  getL1SubgraphClient
} from '../../util/SubgraphUtils'

/*
  Retryables are used to fetch ETH transfers to a custom address.
*/

// Extending the standard NextJs request with Deposit-params
type NextApiRequestWithDepositParams = NextApiRequest & {
  query: {
    l2ChainId: string
    search?: string
    sender?: string
    senderNot?: string
    receiver?: string
    receiverNot?: string
    page?: string
    pageSize?: string
    fromBlock?: string
    toBlock?: string
  }
}

type RetryableSubgraphResult = {
  sender: string
  destAddr: string
  timestamp: string
  transactionHash: string
  id: string
  value: string
  blockCreatedAt: string
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
      search = '',
      l2ChainId,
      sender,
      senderNot,
      receiver,
      receiverNot,
      totalFetched = '0',
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

    const subgraphResult = await getL1SubgraphClient(Number(l2ChainId)).query({
      query: gql(`{
        retryables(
          where: {            
            ${sender ? `sender: "${sender}",` : ''}
            ${senderNot ? `sender_not: "${senderNot}",` : ''}
            ${receiver ? `destAddr: "${receiver}",` : ''}
            ${receiverNot ? `destAddr_not: "${receiverNot}",` : ''}   
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
          value_gt: "0",
          orderBy: blockCreatedAt
          orderDirection: desc
          first: ${Number(pageSize)},
          skip: ${Number(totalFetched)}
        ) {
          sender,
          destAddr,
          timestamp,
          transactionHash,
          id,
          value,
          blockCreatedAt              
        }
      }
    `)
    })

    const transactions: FetchDepositsFromSubgraphResult[] = (
      subgraphResult.data.retryables as RetryableSubgraphResult[]
    ).map(s => {
      return {
        sender: s.sender,
        receiver: s.destAddr,
        sequenceNumber: '',
        timestamp: s.timestamp,
        transactionHash: s.transactionHash,
        type: 'EthDeposit',
        isClassic: false,
        id: s.id,
        ethValue: s.value,
        blockCreatedAt: s.blockCreatedAt,
        subgraphQueryType:
          senderNot && receiver
            ? SubgraphQueryTypes.RetryableReceived
            : SubgraphQueryTypes.RetryableSent
      }
    })

    res.status(200).json({ data: transactions })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: []
    })
  }
}
