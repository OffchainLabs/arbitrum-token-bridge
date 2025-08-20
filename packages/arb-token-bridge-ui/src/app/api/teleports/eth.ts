import { NextRequest, NextResponse } from 'next/server'
import { gql } from '@apollo/client'
import {
  getL1SubgraphClient,
  getSourceFromSubgraphClient
} from '../../../api-utils/ServerSubgraphUtils'
import { getInboxAddressFromOrbitChainId } from '../../../util/orbitChainsList'
import { FetchEthTeleportsFromSubgraphResult } from '../../../util/teleports/fetchEthTeleportsFromSubgraph'

type EthTeleportResponse = {
  meta?: { source: string | null }
  data: FetchEthTeleportsFromSubgraphResult[]
  message?: string // in case of any error
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<EthTeleportResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const sender = searchParams.get('sender') || undefined
    const receiver = searchParams.get('receiver') || undefined
    const l1ChainId = searchParams.get('l1ChainId')
    const l2ChainId = searchParams.get('l2ChainId')
    const l3ChainId = searchParams.get('l3ChainId')
    const page = searchParams.get('page') || '0'
    const pageSize = searchParams.get('pageSize') || '10'

    // validate the request parameters
    const errorMessage = []

    if (!l1ChainId) errorMessage.push('<l1ChainId> is required')

    if (!l2ChainId) errorMessage.push('<l2ChainId> is required')

    if (!l3ChainId) errorMessage.push('<l3ChainId> is required')

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

    const l3InboxAddress = getInboxAddressFromOrbitChainId(Number(l3ChainId))

    if (typeof l3InboxAddress === 'undefined') {
      return NextResponse.json(
        {
          message: `inbox address not found for chain-id: ${l1ChainId} -> ${l2ChainId} -> ${l3ChainId}`,
          data: []
        },
        { status: 400 }
      )
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
