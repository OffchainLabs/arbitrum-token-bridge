import { NextRequest, NextResponse } from 'next/server'
import { gql } from '@apollo/client'

import { FetchDepositsFromSubgraphResult } from '../../util/deposits/fetchDepositsFromSubgraph'
import {
  getL1SubgraphClient,
  getSourceFromSubgraphClient
} from '../../api-utils/ServerSubgraphUtils'

type DepositsResponse = {
  meta?: { source: string | null }
  data: FetchDepositsFromSubgraphResult[]
  message?: string // in case of any error
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<DepositsResponse>> {
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

    // validate the request parameters
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
    ${search ? `transactionHash_contains: "${search}"` : ''}
    `

    let subgraphClient
    try {
      subgraphClient = getL1SubgraphClient(Number(l2ChainId))
    } catch (error: any) {
      // catch attempt to query unsupported networks and throw a 400
      return NextResponse.json(
        {
          message: error?.message ?? 'Something went wrong',
          data: []
        },
        { status: 400 }
      )
    }

    const subgraphResult = await subgraphClient.query({
      query: gql(`{
        deposits(
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
          orderBy: blockCreatedAt
          orderDirection: desc
          first: ${Number(pageSize)},
          skip: ${Number(page) * Number(pageSize)}
        ) {
          receiver
          sender
          sequenceNumber
          timestamp
          tokenAmount
          transactionHash
          type
          isClassic
          id
          ethValue
          blockCreatedAt
          l1Token {
            symbol
            decimals    
            id
            name
            registeredAtBlock
          }                  
        }
      }
    `)
    })

    const transactions: FetchDepositsFromSubgraphResult[] =
      subgraphResult.data.deposits

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
