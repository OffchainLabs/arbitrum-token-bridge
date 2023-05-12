import useSWRImmutable from 'swr/immutable'
import { SWRResponse } from 'swr'
import axios from 'axios'
import { TokenList } from '@uniswap/token-lists'
import { ArbTokenBridge, validateTokenList } from 'token-bridge-sdk'
import { ImageProps } from 'next/image'
import ArbitrumLogo from '@/images/lists/arbitrum.svg'
import UniswapLogo from '@/images/lists/uniswap.png'
import GeminiLogo from '@/images/lists/gemini.png'
import CMCLogo from '@/images/lists/cmc.png'
import ArbitrumFoundation from '@/images/lists/ArbitrumFoundation.png'

export const SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID = 0

export interface BridgeTokenList {
  id: number
  originChainID: number
  url: string
  name: string
  isDefault: boolean
  isArbitrumTokenTokenList?: boolean
  logoURI: ImageProps['src']
}

export const BRIDGE_TOKEN_LISTS: BridgeTokenList[] = [
  {
    id: SPECIAL_ARBITRUM_TOKEN_TOKEN_LIST_ID,
    originChainID: 0, // This token list spans all Arbitrum chains and their L1 counterparts
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbitrum_token_token_list.json',
    name: 'Arbitrum Token',
    isDefault: true,
    logoURI: ArbitrumFoundation,
    isArbitrumTokenTokenList: true
  },
  {
    id: 1,
    originChainID: 42161,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json',
    name: 'Arbitrum Whitelist Era',
    isDefault: true,
    logoURI: ArbitrumLogo
  },
  {
    id: 2,
    originChainID: 42161,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_uniswap_labs_default.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI: UniswapLogo
  },
  {
    id: 3,
    originChainID: 42161,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_gemini_token_list.json',
    name: 'Arbed Gemini List',
    isDefault: false,
    logoURI: GeminiLogo
  },
  {
    id: 5,
    originChainID: 42161,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_coinmarketcap.json',
    name: 'Arbed CMC List',
    isDefault: false,
    logoURI: CMCLogo
  },
  {
    id: 6,
    originChainID: 42170,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs_default.json',
    name: 'Arbed Uniswap List',
    isDefault: true,
    logoURI: UniswapLogo
  },
  {
    id: 7,
    originChainID: 42170,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_gemini_token_list.json',
    name: 'Arbed Gemini List',
    isDefault: true,
    logoURI: GeminiLogo
  },
  {
    id: 8,
    originChainID: 421613,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/421613_arbed_coinmarketcap.json',
    name: 'Arbed CMC List',
    isDefault: true,
    logoURI: CMCLogo
  },
  // Dummy data required, otherwise useArbTokenBridge will return undefined bridgeTokens
  // This will cause TokenImportDialog to hang and fail E2E
  // TODO: remove list for chain ID 412346 after fix:
  // https://github.com/OffchainLabs/arb-token-bridge/issues/564
  {
    id: 9,
    // Local node
    originChainID: 412346,
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/421613_arbed_coinmarketcap.json',
    name: 'Arbed CMC List',
    isDefault: true,
    logoURI: CMCLogo
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
      bridgeTokenList =>
        bridgeTokenList.originChainID === forL2ChainId ||
        // Always load the Arbitrum Token token list
        bridgeTokenList.isArbitrumTokenTokenList
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
