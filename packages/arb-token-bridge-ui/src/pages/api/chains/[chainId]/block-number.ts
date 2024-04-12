import { NextApiRequest, NextApiResponse } from 'next'
import { gql } from '@apollo/client'

import { ChainId } from '../../../../util/networks'
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

    case ChainId.ArbitrumSepolia:
      return getL2SubgraphClient(ChainId.ArbitrumSepolia)

    default:
      throw new Error(`[getSubgraphClient] unsupported chain id: ${chainId}`)
  }
}

export default async function handler(
  req: NextApiRequest & { query: { chainId: string } },
  res: NextApiResponse<
    { data: number; meta?: { source: string | null } } | { message: string }
  >
) {
  const { chainId } = req.query

  // validate method
  if (req.method !== 'GET') {
    res.status(400).json({ message: `invalid method: ${req.method}` })
    return
  }

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

    res.status(200).json({
      meta: { source: getSourceFromSubgraphClient(subgraphClient) },
      data: result.data._meta.block.number
    })
  } catch (error) {
    res.status(200).json({ data: 0 })
  }
}
