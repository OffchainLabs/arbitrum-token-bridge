import { gql } from '@apollo/client'
import { NextApiRequest, NextApiResponse } from 'next'

import { ChainId } from '../../../util/networks'
import { Address } from '../../../util/AddressUtils'

import {
  getCctpSubgraphClient,
  getSourceFromSubgraphClient
} from '../../../api-utils/ServerSubgraphUtils'

// Extending the standard NextJs request with CCTP params
export type NextApiRequestWithCCTPParams = NextApiRequest & {
  query: {
    walletAddress: Address
    l1ChainId: string
    pageNumber?: string
    pageSize?: string
  }
}

export enum ChainDomain {
  Ethereum = 0,
  ArbitrumOne = 3
}

export type MessageReceived = {
  blockNumber: string
  blockTimestamp: string
  caller: Address
  id: string
  messageBody: string
  nonce: string
  sender: Address
  sourceDomain: `${ChainDomain}`
  transactionHash: Address
}

export type MessageSent = {
  attestationHash: Address
  blockNumber: string
  blockTimestamp: string
  id: string
  message: string
  nonce: string
  sender: Address
  recipient: Address
  sourceDomain: `${ChainDomain}`
  transactionHash: Address
  amount: string
}

export type PendingCCTPTransfer = {
  messageSent: MessageSent
}

export type CompletedCCTPTransfer = PendingCCTPTransfer & {
  messageReceived: MessageReceived
}

export type Response =
  | {
      meta?: {
        source: string | null
      }
      data: {
        pending: PendingCCTPTransfer[]
        completed: CompletedCCTPTransfer[]
      }
      error: null
    }
  | {
      data: {
        pending: []
        completed: []
      }
      error: string
    }

export default async function handler(
  req: NextApiRequestWithCCTPParams,
  res: NextApiResponse<Response>
) {
  try {
    const {
      walletAddress,
      l1ChainId: l1ChainIdString,
      pageNumber = '0',
      pageSize = '10',
      type
    } = req.query
    const l1ChainId = parseInt(l1ChainIdString, 10)

    if (
      typeof type !== 'string' ||
      (type !== 'deposits' && type !== 'withdrawals')
    ) {
      res.status(400).send({
        error: `invalid API route: ${type}`,
        data: {
          pending: [],
          completed: []
        }
      })
      return
    }

    // validate method
    if (req.method !== 'GET') {
      res.status(400).send({
        error: `invalid_method: ${req.method}`,
        data: {
          pending: [],
          completed: []
        }
      })
      return
    }

    // validate the request parameters
    const errorMessage = []
    if (!l1ChainId) errorMessage.push('<l1ChainId> is required')
    if (!walletAddress) errorMessage.push('<walletAddress> is required')

    if (errorMessage.length) {
      res.status(400).json({
        error: `incomplete request: ${errorMessage.join(', ')}`,
        data: {
          pending: [],
          completed: []
        }
      })
      return
    }

    // if invalid pageSize, send empty data instead of error
    if (isNaN(Number(pageSize)) || Number(pageSize) === 0) {
      res.status(200).json({
        data: {
          pending: [],
          completed: []
        },
        error: null
      })
      return
    }

    const l2ChainId =
      l1ChainId === ChainId.Ethereum
        ? ChainId.ArbitrumOne
        : ChainId.ArbitrumSepolia

    const l1Subgraph = getCctpSubgraphClient(l1ChainId)
    const l2Subgraph = getCctpSubgraphClient(l2ChainId)

    const messagesSentQuery = gql(`{
      messageSents(
        where: {
          or: [
            { sender: "${walletAddress}" },
            { recipient: "${walletAddress}" }
          ]
        }
        orderDirection: "desc"
        orderBy: "blockTimestamp"
        first: ${Number(pageSize)}
        skip: ${Number(pageNumber) * Number(pageSize)}
      ) {
        attestationHash
        blockNumber
        blockTimestamp
        id
        message
        sender
        recipient
        sourceDomain
        transactionHash
        amount
      }
    }`)

    const sourceSubgraph = type === 'deposits' ? l1Subgraph : l2Subgraph
    const messagesSentResult = await sourceSubgraph.query<{
      messageSents: MessageSent[]
    }>({
      query: messagesSentQuery
    })
    const { messageSents } = messagesSentResult.data
    const formattedIds = messageSents.map(messageSent => `"${messageSent.id}"`)

    const messagesReceivedQuery = gql(`{
        messageReceiveds(
          where: {id_in: [${formattedIds.join(',')}]}
          orderDirection: "desc"
          orderBy: "blockTimestamp"
        ) {
          id
          caller
          sourceDomain
          blockTimestamp
          blockNumber
          messageBody
          sender
          transactionHash
        }
      }
    `)

    const targetSubgraph = type === 'deposits' ? l2Subgraph : l1Subgraph
    const messagesReceivedResult = await targetSubgraph.query<{
      messageReceiveds: MessageReceived[]
    }>({
      query: messagesReceivedQuery
    })

    const { messageReceiveds } = messagesReceivedResult.data

    // MessagesSent can be link to MessageReceived with the tuple (sourceDomain, nonce)
    // Map constructor accept an array of [key, value] arrays
    // new Map(['key1', 'value1'], ['key2', 'value2'], ['keyN', 'valueN']) would return
    // Map(3) {'key1' => 'value1', 'key2' => 'value2', 'keyN' => 'valueN'}
    // We create a map with all keys being MessagesReceived ids, and values being the corresponding MessageReceived
    const messagesReceivedMap = new Map(
      messageReceiveds.map(messageReceived => [
        messageReceived.id,
        messageReceived
      ])
    )

    const { pending, completed } = messageSents.reduce(
      (acc, messageSent) => {
        // If the MessageSent has a corresponding MessageReceived
        const messageReceived = messagesReceivedMap.get(messageSent.id)
        if (messageReceived) {
          acc.completed.push({
            messageReceived,
            messageSent
          })
        } else {
          acc.pending.push({
            messageSent
          })
        }
        return acc
      },
      { completed: [], pending: [] } as {
        completed: CompletedCCTPTransfer[]
        pending: PendingCCTPTransfer[]
      }
    )

    res.status(200).json({
      meta: {
        source: getSourceFromSubgraphClient(l1Subgraph)
      },
      data: {
        pending,
        completed
      },
      error: null
    })
  } catch (error: unknown) {
    res.status(500).json({
      data: {
        pending: [],
        completed: []
      },
      error: (error as Error)?.message ?? 'Something went wrong'
    })
  }
}
