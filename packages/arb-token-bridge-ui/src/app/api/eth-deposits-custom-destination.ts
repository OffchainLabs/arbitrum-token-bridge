import { NextRequest, NextResponse } from 'next/server'
import { gql } from '@apollo/client'

import {
  getL1SubgraphClient,
  getSourceFromSubgraphClient
} from '../../api-utils/ServerSubgraphUtils'
import { FetchEthDepositsToCustomDestinationFromSubgraphResult } from '../../util/deposits/fetchEthDepositsToCustomDestinationFromSubgraph'

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

export async function GET(
  request: NextRequest
): Promise<NextResponse<EthDepositsToCustomDestinationResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const sender = searchParams.get('sender') || undefined
    const receiver = searchParams.get('receiver') || undefined
    const search = searchParams.get('search') || ''
    const l2ChainId = searchParams.get('l2ChainId')
    const page = searchParams.get('page') || '0'
    const pageSize = searchParams.get('pageSize') || '10'
    const fromBlock = searchParams.get('fromBlock') || undefined
    const toBlock = searchParams.get('toBlock') || undefined

    const errorMessage = []
    if (!l2ChainId) errorMessage.push('<l2ChainId> is required')
    if (!sender && !receiver)
      errorMessage.push('<sender> or <receiver> is required')

    if (errorMessage.length) {
      return NextResponse.json(
        {
          message: `incomplete request: ${errorMessage.join(', ')}`,
          data: []
        },
        { status: 400 }
      )
    }

    // if invalid pageSize, send empty data instead of error
    if (isNaN(Number(pageSize)) || Number(pageSize) === 0) {
      return NextResponse.json({ data: [] }, { status: 200 })
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

    return NextResponse.json(
      {
        meta: { source: getSourceFromSubgraphClient(subgraphClient) },
        data: transactions
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message ?? 'Something went wrong',
        data: []
      },
      { status: 500 }
    )
  }
}
