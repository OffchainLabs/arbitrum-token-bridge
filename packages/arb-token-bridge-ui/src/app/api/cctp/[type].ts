import { gql } from '@apollo/client'
import { NextRequest, NextResponse } from 'next/server'

import { ChainId } from '../../../types/ChainId'
import { Address } from '../../../util/AddressUtils'

import {
  getCctpSubgraphClient,
  getSourceFromSubgraphClient
} from '../../../api-utils/ServerSubgraphUtils'

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

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
): Promise<NextResponse<Response>> {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress') as Address
    const l1ChainIdString = searchParams.get('l1ChainId') || '1'
    const pageNumber = searchParams.get('pageNumber') || '0'
    const pageSize = searchParams.get('pageSize') || '10'
    const type = params.type
    const l1ChainId = parseInt(l1ChainIdString, 10)

    if (
      typeof type !== 'string' ||
      (type !== 'deposits' && type !== 'withdrawals')
    ) {
      return NextResponse.json(
        {
          error: `invalid API route: ${type}`,
          data: {
            pending: [],
            completed: []
          }
        },
        { status: 400 }
      )
    }

    // validate the request parameters
    const errorMessage = []
    if (!l1ChainId) errorMessage.push('<l1ChainId> is required')
    if (!walletAddress) errorMessage.push('<walletAddress> is required')

    if (errorMessage.length) {
      return NextResponse.json(
        {
          error: `incomplete request: ${errorMessage.join(', ')}`,
          data: {
            pending: [],
            completed: []
          }
        },
        { status: 400 }
      )
    }

    // if invalid pageSize, send empty data instead of error
    if (isNaN(Number(pageSize)) || Number(pageSize) === 0) {
      return NextResponse.json(
        {
          data: {
            pending: [],
            completed: []
          },
          error: null
        },
        { status: 200 }
      )
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

    /**
     * TheGraph API returns up to 100 results for messageReceiveds.
     * If we have more than 100 messageSents, we batch the queries for messageReceiveds
     */
    const chunkSize = 99
    /** MessagesSent can be link to MessageReceived with the tuple (sourceDomain, nonce) */
    // const messagesReceivedMap = new Map<string, MessageReceived>()
    const messageReceivedsPromises = []
    for (let i = 0; i < formattedIds.length; i += chunkSize) {
      const chunk = formattedIds.slice(i, i + chunkSize)
      const messagesReceivedQuery = gql(`{
        messageReceiveds(
          where: {id_in: [${chunk.join(',')}]}
          orderDirection: "desc"
          orderBy: "blockTimestamp"
          first: ${chunkSize}
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
      messageReceivedsPromises.push(
        targetSubgraph
          .query<{ messageReceiveds: MessageReceived[] }>({
            query: messagesReceivedQuery
          })
          .then(response => response.data.messageReceiveds)
      )
    }

    const messageReceiveds = (
      await Promise.all(messageReceivedsPromises)
    ).flatMap(chunk => chunk)

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

    return NextResponse.json(
      {
        meta: {
          source: getSourceFromSubgraphClient(l1Subgraph)
        },
        data: {
          pending,
          completed
        },
        error: null
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    return NextResponse.json(
      {
        data: {
          pending: [],
          completed: []
        },
        error: (error as Error)?.message ?? 'Something went wrong'
      },
      { status: 500 }
    )
  }
}
