import { NextApiResponse } from 'next'
import { ApolloQueryResult, gql } from '@apollo/client'
import { ChainId } from '../../../util/networks'
import {
  getSubgraphClient,
  MessageSent,
  MessageReceived,
  NextApiRequestWithCCTPParams
} from './utils'

export type Response =
  | {
      data: {
        pending: MessageSent[]
        fulfilled: MessageSent[]
      }
    }
  | {
      data: null
      message: string // in case of any error
    }

export default async function handler(
  req: NextApiRequestWithCCTPParams,
  res: NextApiResponse<Response>
) {
  try {
    const { walletAddress, l1ChainId } = req.query

    // validate method
    if (req.method !== 'GET') {
      res
        .status(400)
        .send({ message: `invalid_method: ${req.method}`, data: null })
      return
    }

    // validate the request parameters
    const errorMessage = []
    if (!l1ChainId) errorMessage.push('<l1ChainId> is required')
    if (!walletAddress) errorMessage.push('<walletAddress> is required')

    if (errorMessage.length) {
      res.status(400).json({
        message: `incomplete request: ${errorMessage.join(', ')}`,
        data: null
      })
    }

    const l1Subgraph = getSubgraphClient(
      l1ChainId === ChainId.Mainnet ? 'cctp' : 'cctp-goerli'
    )
    const l2Subgraph = getSubgraphClient(
      l1ChainId === ChainId.Mainnet ? 'arb1-cctp' : 'arb1-cctp-goerli'
    )

    const messageSentsQuery = l2Subgraph.query({
      query: gql(`{
        messageSents(
          where: {            
            sender: "${walletAddress}"
          }
          orderDirection: "desc"
          orderBy: "blockTimestamp"
        ) {
          attestationHash
          blockNumber
          blockTimestamp
          id
          message
          nonce
          sender
          sourceDomain
          transactionHash
        }
      }
    `)
    })
    const messageReceivedQuery = l1Subgraph.query({
      query: gql(`{
        messageReceiveds(
          where: {          
            caller: "${walletAddress}"
          }
          orderDirection: "desc"
          orderBy: "blockTimestamp"
        ) {
          id
          caller
          sourceDomain
          nonce
          blockTimestamp
          blockNumber
          messageBody
          sender
          transactionHash           
        }
      }
    `)
    })

    const [messageSentsResult, messageReceivedResult]: [
      ApolloQueryResult<{ messageSents: MessageSent[] }>,
      ApolloQueryResult<{ messageReceiveds: MessageReceived[] }>
    ] = await Promise.all([messageSentsQuery, messageReceivedQuery])

    const { messageSents } = messageSentsResult.data
    const { messageReceiveds } = messageReceivedResult.data

    // MessageSents from L2 can be link to MessageSents on L1 with the tuple (sourceDomain, nonce)
    // Multiple MessageSent can have the same tuple, we should consider only the most recent one
    const messageReceivedMap = new Map(
      messageReceiveds.map(messageReceived => [
        messageReceived.id,
        messageReceived
      ])
    )

    const { pending, fulfilled } = messageSents.reduce(
      (acc, message) => {
        // If the MessageSent has a corresponding MessageReceived
        if (messageReceivedMap.has(message.id)) {
          acc.fulfilled.push(message)
        } else {
          acc.pending.push(message)
        }

        return acc
      },
      {
        fulfilled: [],
        pending: []
      } as {
        fulfilled: MessageSent[]
        pending: MessageSent[]
      }
    )

    res.status(200).json({
      data: {
        pending,
        fulfilled
      }
    })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: null
    })
  }
}
