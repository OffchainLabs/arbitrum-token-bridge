import { NextApiRequest, NextApiResponse } from 'next'
import { gql } from '@apollo/client'

import { ChainId } from '../../../../util/networks'
import {
  getL1SubgraphClient,
  getL2SubgraphClient
} from '../../../../util/SubgraphUtils'

function getSubgraphClient(chain: string) {
  switch (chain) {
    case 'ethereum':
      // it's the same whether we do arb1 or nova
      return getL1SubgraphClient(ChainId.ArbitrumOne)

    case 'sepolia':
      return getL1SubgraphClient(ChainId.ArbitrumSepolia)

    case 'arbitrum-one':
      return getL2SubgraphClient(ChainId.ArbitrumOne)

    case 'arbitrum-sepolia':
      return getL2SubgraphClient(ChainId.ArbitrumSepolia)

    default:
      throw new Error(`[getSubgraphClient] unsupported chain: ${chain}`)
  }
}

export default async function handler(
  req: NextApiRequest & { query: { chain: string } },
  res: NextApiResponse<{ data: number } | { message: string }>
) {
  const { chain } = req.query

  // validate method
  if (req.method !== 'GET') {
    res.status(400).json({ message: `invalid method: ${req.method}` })
    return
  }

  try {
    const result: {
      data: {
        _meta: {
          block: {
            number: number
          }
        }
      }
    } = await getSubgraphClient(chain).query({
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

    res.status(200).json({ data: result.data._meta.block.number })
  } catch (error) {
    res.status(200).json({ data: 0 })
  }
}
