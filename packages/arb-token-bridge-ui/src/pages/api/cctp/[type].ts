import {
  ApolloClient,
  ApolloQueryResult,
  gql,
  HttpLink,
  InMemoryCache
} from '@apollo/client'
import { NextApiRequest, NextApiResponse } from 'next'
import { ChainId } from '../../../util/networks'

export function getSubgraphClient(subgraph: string) {
  return new ApolloClient({
    link: new HttpLink({
      uri: `https://api.thegraph.com/subgraphs/name/chrstph-dvx/${subgraph}`,
      fetch
    }),
    cache: new InMemoryCache()
  })
}

// Extending the standard NextJs request with CCTP params
export type NextApiRequestWithCCTPParams = NextApiRequest & {
  query: {
    address: `0x${string}`
    l1ChainId: ChainId
  }
}

export type MessageReceived = {
  blockNumber: number
  blockTimestamp: number
  caller: `0x${string}`
  id: string
  messageBody: string
  nonce: number
  sender: `0x${string}`
  sourceDomain: 0 | 1 // 0: Mainnet, 1: Avalanche
  transactionHash: `0x${string}`
}

export type MessageSent = {
  attestationHash: `0x${string}`
  blockNumber: number
  blockTimestamp: number
  id: string
  message: string
  nonce: number
  sender: `0x${string}`
  sourceDomain: 0 | 1 // 0: Mainnet, 1: Avalanche
  transactionHash: `0x${string}`
}

export type Response =
  | {
      data: {
        pending: MessageSent[]
        fulfilled: MessageSent[]
      }
      error: null
    }
  | {
      data: null
      error: string
    }

export default async function handler(
  req: NextApiRequestWithCCTPParams,
  res: NextApiResponse<Response>
) {
  try {
    const { walletAddress, l1ChainId } = req.query
    const { type } = req.query

    if (
      typeof type !== 'string' ||
      (type !== 'deposits' && type !== 'withdrawals')
    ) {
      res.status(400).send({ error: `invalid API route: ${type}`, data: null })
      return
    }

    // validate method
    if (req.method !== 'GET') {
      res
        .status(400)
        .send({ error: `invalid_method: ${req.method}`, data: null })
      return
    }

    // validate the request parameters
    const errorMessage = []
    if (!l1ChainId) errorMessage.push('<l1ChainId> is required')
    if (!walletAddress) errorMessage.push('<walletAddress> is required')

    if (errorMessage.length) {
      res.status(400).json({
        error: `incomplete request: ${errorMessage.join(', ')}`,
        data: null
      })
      return
    }

    const l1Subgraph = getSubgraphClient(
      l1ChainId === ChainId.Mainnet ? 'cctp' : 'cctp-goerli'
    )
    const l2Subgraph = getSubgraphClient(
      l1ChainId === ChainId.Mainnet ? 'arb1-cctp' : 'arb1-cctp-goerli'
    )

    const messageSentsQuery = gql(`{
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
      }`)

    const messageReceivedsQuery = gql(`{
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

    let messageSentsResult: ApolloQueryResult<{ messageSents: MessageSent[] }>
    let messageReceivedsResult: ApolloQueryResult<{
      messageReceiveds: MessageReceived[]
    }>
    if (type === 'deposits') {
      ;[messageSentsResult, messageReceivedsResult] = await Promise.all([
        l1Subgraph.query({ query: messageSentsQuery }),
        l2Subgraph.query({ query: messageReceivedsQuery })
      ])
    } else {
      ;[messageSentsResult, messageReceivedsResult] = await Promise.all([
        l2Subgraph.query({ query: messageSentsQuery }),
        l1Subgraph.query({ query: messageReceivedsQuery })
      ])
    }

    const { messageSents } = messageSentsResult.data
    const { messageReceiveds } = messageReceivedsResult.data

    // MessageSents can be link to MessageReceived with the tuple (sourceDomain, nonce)
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
      },
      error: null
    })
  } catch (error: any) {
    res.status(500).json({
      data: null,
      error: error?.message ?? 'Something went wrong'
    })
  }
}
