/*
  Hook and Utility functions meant for fetching and maintaining the token-lists on the basis of our existing hardcoded `BRIDGE_TOKEN_LISTS`
  - will have SWR caching
*/

import useSWRImmutable from 'swr/immutable'
import { SWRResponse } from 'swr'
import axios from 'axios'
import { TokenList } from '@uniswap/token-lists'
import { ArbTokenBridge } from '../hooks/arbTokenBridge.types'
import { validateTokenList } from '../util'

export interface BridgeTokenList {
  id: number
  originChainID: number
  url: string
  name: string
  isDefault: boolean
  logoURI: string
}

export const BRIDGE_TOKEN_LISTS: BridgeTokenList[] = [
  {
    id: 1,
    originChainID: 42161,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json',
    name: 'Arbitrum Whitelist Era',
    isDefault: true,
    logoURI:
      'https://ipfs.io/ipfs/QmTvWJ4kmzq9koK74WJQ594ov8Es1HHurHZmMmhU8VY68y'
  },
  {
    id: 2,
    originChainID: 42161,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs_list.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI:
      'https://ipfs.io/ipfs/QmNa8mQkrNKp1WEEeGjFezDmDeodkWRevGFN8JCV7b4Xir'
  },
  {
    id: 3,
    originChainID: 42161,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_gemini_token_list.json',
    name: 'Arbed Gemini List',
    isDefault: false,
    logoURI: 'https://gemini.com/static/images/loader.png'
  },
  {
    id: 5,
    originChainID: 42161,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json',
    name: 'Arbed CMC List',
    isDefault: false,
    logoURI:
      'https://ipfs.io/ipfs/QmQAGtNJ2rSGpnP6dh6PPKNSmZL8RTZXmgFwgTdy5Nz5mx'
  },
  {
    id: 6,
    originChainID: 42170,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs_default.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI:
      'https://ipfs.io/ipfs/QmNa8mQkrNKp1WEEeGjFezDmDeodkWRevGFN8JCV7b4Xir'
  },
  {
    id: 7,
    originChainID: 42170,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_gemini_token_list.json',
    name: 'Arbed Gemini List',
    isDefault: true,
    logoURI: 'https://gemini.com/static/images/loader.png'
  },
  {
    id: 8,
    originChainID: 421613,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/421613_arbed_coinmarketcap.json',
    name: 'Arbed CMC List',
    isDefault: true,
    logoURI:
      'https://ipfs.io/ipfs/QmQAGtNJ2rSGpnP6dh6PPKNSmZL8RTZXmgFwgTdy5Nz5mx'
  }
]

export const listIdsToNames: { [key: string]: string } = {}

BRIDGE_TOKEN_LISTS.forEach(bridgeTokenList => {
  listIdsToNames[bridgeTokenList.id] = bridgeTokenList.name
})

export interface TokenListWithId extends TokenList {
  l2ChainId: string
  bridgeTokenListId: number
  isValid?: boolean
}

export const addBridgeTokenListToBridge = (
  bridgeTokenList: BridgeTokenList,
  arbTokenBridge: ArbTokenBridge
) => {
  fetchTokenListFromURL(bridgeTokenList.url).then(
    ({ isValid, data: tokenList }) => {
      if (!isValid) return

      arbTokenBridge.token.addTokensFromList(tokenList!, bridgeTokenList.id)
    }
  )
}

export async function fetchTokenListFromURL(tokenListURL: string): Promise<{
  isValid: boolean
  data: TokenList | undefined
}> {
  try {
    const { data } = await axios.get(tokenListURL, {
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    })

    if (!validateTokenList(data)) {
      console.warn('Token List Invalid', data)
      return { isValid: false, data }
    }

    return { isValid: true, data }
  } catch (error) {
    console.warn('Token List URL Invalid', tokenListURL)
    return { isValid: false, data: undefined }
  }
}

export function fetchTokenLists(
  forL2ChainId: number
): Promise<TokenListWithId[]> {
  return new Promise(resolve => {
    const requestListArray = BRIDGE_TOKEN_LISTS.filter(
      bridgeTokenList => bridgeTokenList.originChainID === forL2ChainId
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
    (_, _forL2ChainId) => fetchTokenLists(_forL2ChainId),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000
    }
  )
}
