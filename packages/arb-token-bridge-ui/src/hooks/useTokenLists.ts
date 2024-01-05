import useSWRImmutable from 'swr/immutable'
import { SWRResponse } from 'swr'
import {
  BRIDGE_TOKEN_LISTS,
  fetchTokenListFromURL,
  TokenListWithId
} from '../util/TokenListUtils'

export async function fetchTokenLists(
  forL2ChainId: number
): Promise<TokenListWithId[]> {
  const requestListArray = BRIDGE_TOKEN_LISTS.filter(
    bridgeTokenList =>
      bridgeTokenList.originChainID === forL2ChainId ||
      // Always load the Arbitrum Token token list
      bridgeTokenList.isArbitrumTokenTokenList
  )

  const lists = await Promise.all(
    requestListArray.map(bridgeTokenList =>
      fetchTokenListFromURL(bridgeTokenList.url)
    )
  ).then(responses => {
    return responses.map((tokenList, index) => {
      const bridgeTokenListId = requestListArray[index]?.id

      if (typeof bridgeTokenListId === 'undefined') {
        return tokenList
      }

      if (typeof tokenList === 'undefined') {
        return undefined
      }

      if (tokenList.tokens.length === 0) {
        return undefined
      }

      return {
        l2ChainId: forL2ChainId,
        bridgeTokenListId,
        ...tokenList
      }
    })
  })

  return lists.filter(
    (tokenList): tokenList is TokenListWithId =>
      typeof tokenList !== 'undefined'
  )
}

export function useTokenLists(
  forL2ChainId: number
): SWRResponse<TokenListWithId[]> {
  return useSWRImmutable(
    ['useTokenLists', forL2ChainId],
    ([, _forL2ChainId]) => fetchTokenLists(_forL2ChainId),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000
    }
  )
}
