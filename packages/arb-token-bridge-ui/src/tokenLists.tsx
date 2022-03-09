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
  }
]

export const listIdsToNames: { [key: string]: string } = {}

BRIDGE_TOKEN_LISTS.forEach(bridgeTokenList => {
  listIdsToNames[bridgeTokenList.id] = bridgeTokenList.name
})

export const addBridgeTokenListToBridge = (
  bridgeTokenList: BridgeTokenList,
  arbTokenBridge: ArbTokenBridge
) => {
  fetchTokenListFromURL(bridgeTokenList.url).then(
    ({ isValid, data: tokenList }) => {
      if (isValid) {
        arbTokenBridge.token.addTokensFromList(tokenList!, bridgeTokenList.id)
      }
    }
  )
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
