import { useEffect, useState } from 'react'
import axios from 'axios'
import { TokenList } from '@uniswap/token-lists'
import { ArbTokenBridge, validateTokenList } from 'token-bridge-sdk'

export interface BridgeTokenList {
  id: number
  originChainID: string
  url: string
  name: string
  isDefault: boolean
  logoURI: string
}

export const BRIDGE_TOKEN_LISTS: BridgeTokenList[] = [
  {
    id: 1,
    originChainID: '42161',
    url: 'token-list-42161.json',
    name: 'Arbitrum Whitelist Era',
    isDefault: true,
    logoURI:
      'https://ipfs.io/ipfs/QmTvWJ4kmzq9koK74WJQ594ov8Es1HHurHZmMmhU8VY68y'
  },
  {
    id: 2,
    originChainID: '42161',
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs_list.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI:
      'https://ipfs.io/ipfs/QmNa8mQkrNKp1WEEeGjFezDmDeodkWRevGFN8JCV7b4Xir'
  },
  {
    id: 3,
    originChainID: '42161',
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_gemini_token_list.json',
    name: 'Arbed Gemini List',
    isDefault: false,
    logoURI: 'https://gemini.com/static/images/loader.png'
  },
  {
    id: 4,
    originChainID: '421611',
    url: 'token-list-421611.json',
    name: 'Rinkarby Tokens',
    isDefault: true,
    logoURI:
      'https://ipfs.io/ipfs/QmTvWJ4kmzq9koK74WJQ594ov8Es1HHurHZmMmhU8VY68y'
  },
  {
    id: 5,
    originChainID: '42161',
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json',
    name: 'Arbed CMC List',
    isDefault: false,
    logoURI:
      'https://ipfs.io/ipfs/QmQAGtNJ2rSGpnP6dh6PPKNSmZL8RTZXmgFwgTdy5Nz5mx'
  },
  {
    id: 6,
    originChainID: '42170',
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs_default.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI:
      'https://ipfs.io/ipfs/QmNa8mQkrNKp1WEEeGjFezDmDeodkWRevGFN8JCV7b4Xir'
  },
  {
    id: 7,
    originChainID: '42170',
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_gemini_token_list.json',
    name: 'Arbed Gemini List',
    isDefault: true,
    logoURI: 'https://gemini.com/static/images/loader.png'
  }
]

export const listIdsToNames: { [key: string]: string } = {}

BRIDGE_TOKEN_LISTS.forEach(bridgeTokenList => {
  listIdsToNames[bridgeTokenList.id] = bridgeTokenList.name
})

export interface TokenListWithId extends TokenList {
  l2ChainId: string
  bridgeTokenListId: number
}

const STORAGE_KEY = 'arbitrum:bridge:token-lists'

export const addBridgeTokenListToBridge = (
  bridgeTokenList: BridgeTokenList,
  arbTokenBridge: ArbTokenBridge
) => {
  const cache = getTokenLists()
  const found = cache.find(
    list => list.bridgeTokenListId === bridgeTokenList.id
  )

  if (found) {
    arbTokenBridge.token.addTokensFromList(found, bridgeTokenList.id)
  } else {
    fetchTokenListFromURL(bridgeTokenList.url).then(
      ({ isValid, data: tokenList }) => {
        if (isValid) {
          arbTokenBridge.token.addTokensFromList(tokenList!, bridgeTokenList.id)
        }
      }
    )
  }
}

export async function fetchTokenListFromURL(
  tokenListURL: string
): Promise<{ isValid: boolean; data: TokenList | undefined }> {
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

export function fetchTokenLists(): Promise<void> {
  return new Promise(resolve => {
    Promise.all(
      BRIDGE_TOKEN_LISTS.map(bridgeTokenList =>
        fetchTokenListFromURL(bridgeTokenList.url)
      )
    ).then(responses => {
      const tokenListsWithBridgeTokenListId = responses
        .filter(({ isValid }) => isValid)
        // Attach the bridge token list id so we can easily retrieve a list later
        .map(({ data }, index) => ({
          l2ChainId: BRIDGE_TOKEN_LISTS[index].originChainID,
          bridgeTokenListId: BRIDGE_TOKEN_LISTS[index].id,
          ...data
        }))

      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tokenListsWithBridgeTokenListId)
      )

      resolve()
    })
  })
}

export function useTokenLists(forL2ChainId?: string): TokenListWithId[] {
  const [tokenLists, setTokenLists] = useState<TokenListWithId[]>(() =>
    getTokenLists(forL2ChainId)
  )

  useEffect(() => {
    setTokenLists(getTokenLists(forL2ChainId))
  }, [forL2ChainId])

  return tokenLists
}

export function getTokenLists(forL2ChainId?: string): TokenListWithId[] {
  const storage = sessionStorage.getItem(STORAGE_KEY)

  if (!storage) {
    return []
  }

  const parsedStorage: TokenListWithId[] = JSON.parse(storage)

  if (typeof forL2ChainId === 'undefined') {
    return parsedStorage
  }

  return parsedStorage.filter(tokenList => tokenList.l2ChainId === forL2ChainId)
}
