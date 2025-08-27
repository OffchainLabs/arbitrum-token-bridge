import { NextRequest, NextResponse } from 'next/server'
import { gql } from '@apollo/client'

import { ChainId } from '../../../../types/ChainId'
import {
  getL1SubgraphClient,
  getL2SubgraphClient,
  getSourceFromSubgraphClient
} from '../../../../api-utils/ServerSubgraphUtils'

function getSubgraphClient(chainId: number) {
  switch (chainId) {
    case ChainId.Ethereum:
      // it's the same whether we do arb1 or nova
      return getL1SubgraphClient(ChainId.ArbitrumOne)

    case ChainId.Sepolia:
      return getL1SubgraphClient(ChainId.ArbitrumSepolia)

    case ChainId.ArbitrumOne:
      return getL2SubgraphClient(ChainId.ArbitrumOne)

    case ChainId.ArbitrumNova:
      return getL2SubgraphClient(ChainId.ArbitrumNova)

    case ChainId.ArbitrumSepolia:
      return getL2SubgraphClient(ChainId.ArbitrumSepolia)

    default:
      throw new Error(`[getSubgraphClient] unsupported chain id: ${chainId}`)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { chainId: string } }
): Promise<
  NextResponse<
    { data: number; meta?: { source: string | null } } | { message: string }
  >
> {
  const { chainId } = params

  try {
    const subgraphClient = getSubgraphClient(Number(chainId))

    const result: {
      data: {
        _meta: {
          block: {
            number: number
          }
        }
      }
    } = await subgraphClient.query({
      query: gql`
        {
          _meta {
            block {
              number
            }
          }
        }
      `
    })

    return NextResponse.json(
      {
        meta: { source: getSourceFromSubgraphClient(subgraphClient) },
        data: result.data._meta.block.number
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json({ data: 0 }, { status: 200 })
  }
}
