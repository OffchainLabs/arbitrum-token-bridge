import { NextRequest, NextResponse } from 'next/server'
import { gql } from '@apollo/client'

import {
  getSourceFromSubgraphClient,
  getTeleporterSubgraphClient
} from '../../../api-utils/ServerSubgraphUtils'
import { FetchErc20TeleportsFromSubgraphResult } from '../../../util/teleports/fetchErc20TeleportsFromSubgraph'

type Erc20TeleportResponse = {
  meta?: { source: string | null }
  data: FetchErc20TeleportsFromSubgraphResult[]
  message?: string // in case of any error
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<Erc20TeleportResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const sender = searchParams.get('sender') || undefined
    const l1ChainId = searchParams.get('l1ChainId')
    const page = searchParams.get('page') || '0'
    const pageSize = searchParams.get('pageSize') || '10'

    // validate the request parameters
    const errorMessage = []
    if (!l1ChainId) errorMessage.push('<l1ChainId> is required')
    if (!sender) errorMessage.push('<sender> is required')

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

    let subgraphClient
    try {
      subgraphClient = getTeleporterSubgraphClient(Number(l1ChainId))
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
