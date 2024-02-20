import { NextApiRequest, NextApiResponse } from 'next'
import tokenList from './tokenlist.json'
import {
  CrossChainTokenInfo,
  TokenListMap
} from '../../features/tokenLists/store'

export type Response =
  | {
      data: TokenListMap
      error: null
    }
  | {
      data: null
      error: string
    }

type TokensInput = Omit<CrossChainTokenInfo, 'bridgeInfo'> & {
  extensions?: Pick<CrossChainTokenInfo, 'bridgeInfo'>
}
function parseTokenList(list: { tokens: TokensInput[] }): TokenListMap {
  const result: TokenListMap = {}
  for (const token of list.tokens) {
    result[token.chainId] = result[token.chainId] || {}
    // TODO: fix type
    token.bridgeInfo = token.extensions?.bridgeInfo
    delete token.extensions
    result[token.chainId][token.address] = token
  }
  return result
}
const parsedTokenList = parseTokenList(tokenList)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  try {
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
