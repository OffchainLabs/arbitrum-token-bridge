import useSWRImmutable from 'swr/immutable'
import { SWRResponse } from 'swr'
import {
  BRIDGE_TOKEN_LISTS,
  fetchTokenListFromURL,
  TokenListWithId
} from '../util/TokenListUtils'

export function fetchTokenLists(
  forL2ChainId: number,
  isDefaultList = false
): Promise<TokenListWithId[]> {
  return new Promise(resolve => {
    const requestListArray = BRIDGE_TOKEN_LISTS.filter(bridgeTokenList => {
      const isMatchingL2 = bridgeTokenList.originChainID === forL2ChainId
      // Always load the Arbitrum Token token list
      if (bridgeTokenList.isArbitrumTokenTokenList) {
        return true
      }

      if (isDefaultList) {
        return isMatchingL2 && bridgeTokenList.isDefault
      }

      return isMatchingL2
    })

    Promise.all(
      requestListArray.map(bridgeTokenList =>
        fetchTokenListFromURL(bridgeTokenList.url)
      )
    ).then(responses => {
      const tokenListsWithBridgeTokenListId = responses
        .map(({ data, isValid }, index) => {
          const bridgeTokenListId = requestListArray[index]?.id
          const { name, ...tokenListData } = data ?? {}
          const tokenListName = requestListArray[index]?.name ?? name

          if (typeof bridgeTokenListId === 'undefined') {
            return {
              ...tokenListData,
              isValid,
              name: tokenListName
            }
          }

          return {
            l2ChainId: forL2ChainId,
            bridgeTokenListId,
            isValid,
            name: tokenListName,
            ...tokenListData
          }
        })
        .filter(list => list?.isValid)

      resolve(tokenListsWithBridgeTokenListId as TokenListWithId[])
    })
  })
}

export function useTokenLists(
  forL2ChainId: number,
  isDefaultList = false
): SWRResponse<TokenListWithId[]> {
  return useSWRImmutable(
    ['useTokenLists', forL2ChainId, isDefaultList],
    ([, _forL2ChainId, _isDefaultList]) =>
      fetchTokenLists(_forL2ChainId, _isDefaultList),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000
    }
  )
}
