import { NextRequest, NextResponse } from 'next/server'
import { gql } from '@apollo/client'

import { WithdrawalFromSubgraph } from '../../util/withdrawals/fetchWithdrawalsFromSubgraph'
import {
  getL2SubgraphClient,
  getSourceFromSubgraphClient
} from '../../api-utils/ServerSubgraphUtils'

type WithdrawalResponse = {
  meta?: { source: string | null }
  data: WithdrawalFromSubgraph[]
  message?: string // in case of any error
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<WithdrawalResponse>> {
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
      return NextResponse.json(
        {
          message: error?.message ?? 'Something went wrong',
          data: []
        },
        { status: 400 }
      )
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

    const transactions: WithdrawalFromSubgraph[] =
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
