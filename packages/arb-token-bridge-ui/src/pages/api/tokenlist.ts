import { NextApiRequest, NextApiResponse } from 'next'
import tokenList from './tokenlist.json'

type CrossChainTokenInfo = {
  address: string
  chainId: number
  decimals: number
  logoURI: string
  name: string
  symbol: string
  extensions?: {
    bridgeInfo: {
      [chainId: string]: {
        tokenAddress: string
        destBridgeAddress: string
        originBridgeAddress: string
      }
    }
  }
}

export type TokensMap = { [tokenAddress: string]: CrossChainTokenInfo }
export type TokenListMap = {
  [chainId: number]: TokensMap
}
function parseTokenList(list: { tokens: CrossChainTokenInfo[] }): TokenListMap {
  const result: TokenListMap = {}
  for (const token of list.tokens) {
    result[token.chainId] = result[token.chainId] || {}
    result[token.chainId][token.address] = token
  }
  return result
}

export type Response =
  | {
      data: TokenListMap
      error: null
    }
  | {
      data: null
      error: string
    }

const parsedTokenList = parseTokenList(tokenList)
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  try {
    // Add check for invalid chainId
    // if (
    //   typeof type !== 'string' ||
    //   (type !== 'deposits' && type !== 'withdrawals')
    // ) {
    //   res.status(400).send({
    //     error: `invalid API route: ${type}`,
    //     data: {
    //       pending: [],
    //       completed: []
    //     }
    //   })
    //   return
    // }

    // validate method
    if (req.method !== 'GET') {
      res.status(400).send({
        error: `invalid_method: ${req.method}`,
        data: null
      })
      return
    }

    res.status(200).json({
      data: parsedTokenList,
      error: null
    })
  } catch (error: unknown) {
    res.status(500).json({
      data: null,
      error: (error as Error)?.message ?? 'Something went wrong'
    })
  }
}
