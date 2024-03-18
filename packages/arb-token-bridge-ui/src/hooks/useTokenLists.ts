import useSWRImmutable from 'swr/immutable'
import { SWRResponse } from 'swr'
import {
  BRIDGE_TOKEN_LISTS,
  fetchTokenListFromURL,
  TokenListWithId
} from '../util/TokenListUtils'
import { isNetwork } from '../util/networks'

export function fetchTokenLists(
  forL2ChainId: number
): Promise<TokenListWithId[]> {
  return new Promise(resolve => {
    const { isOrbitChain } = isNetwork(forL2ChainId)
    const requestListArray = BRIDGE_TOKEN_LISTS.filter(
      bridgeTokenList =>
        bridgeTokenList.originChainID === forL2ChainId ||
        // Always load the Arbitrum Token token list except from or to Orbit chain
        (bridgeTokenList.isArbitrumTokenTokenList && !isOrbitChain)
    )

    Promise.all(
      requestListArray.map(bridgeTokenList =>
        fetchTokenListFromURL(bridgeTokenList.url)
      )
    ).then(responses => {
      const tokenListsWithBridgeTokenListId = responses
        .map(({ data, isValid }, index) => {
          const bridgeTokenListId = requestListArray[index]?.id

          if (typeof bridgeTokenListId === 'undefined') {
            return { ...data, isValid }
          }

          return {
            l2ChainId: forL2ChainId,
            bridgeTokenListId,
            isValid,
            ...data
          }
        })
        .filter(list => list?.isValid)

      resolve(tokenListsWithBridgeTokenListId as TokenListWithId[])
    })
  })
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
