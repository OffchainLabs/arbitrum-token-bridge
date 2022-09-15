import axios from 'axios'
import {
  ArbTokenBridge,
  BridgeTokenList,
  ERC20BridgeToken,
  L1TokenData,
  SearchableTokenStorage,
  TokenListWithId,
  TokenType
} from '../hooks/arbTokenBridge.types'
import { validateTokenList } from './index'
import { TokenList } from '@uniswap/token-lists'

const STORAGE_KEY = 'arbitrum:bridge:token-lists'

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

export function tokenListsToSearchableTokenStorage(
  tokenLists: TokenListWithId[],
  l1ChainId: string,
  l2ChainId: string
): SearchableTokenStorage {
  return (
    tokenLists
      //
      .reduce((acc: SearchableTokenStorage, tokenList: TokenListWithId) => {
        tokenList.tokens.forEach(token => {
          const address = token.address.toLowerCase()
          const stringifiedChainId = String(token.chainId)

          if (stringifiedChainId === l1ChainId) {
            // The address is from an L1 token

            if (typeof acc[address] === 'undefined') {
              // First time encountering the token through its L1 address
              acc[address] = {
                ...token,
                type: TokenType.ERC20,
                l2Address: undefined,
                tokenLists: []
              }
            } else {
              // Token was already added to the map through its L2 token
              acc[address] = { ...acc[address], address }
            }

            const tokenLists = acc[address].tokenLists

            if (!tokenLists.includes(tokenList.bridgeTokenListId)) {
              acc[address].tokenLists.push(tokenList.bridgeTokenListId)
            }
          } else if (stringifiedChainId === l2ChainId) {
            // The token is an L2 token

            if (!token.extensions?.bridgeInfo) {
              return
            }

            // @ts-ignore
            //
            // TODO: should we upgrade '@uniswap/token-lists'?
            const bridgeInfo: {
              [chainId: string]: { tokenAddress: string }
            } = token.extensions.bridgeInfo

            if (bridgeInfo[l1ChainId]) {
              const addressOnL1 =
                bridgeInfo[l1ChainId].tokenAddress.toLowerCase()

              if (!addressOnL1) {
                return
              }

              if (typeof acc[addressOnL1] === 'undefined') {
                // Token is not on the list yet

                acc[addressOnL1] = {
                  name: token.name,
                  symbol: token.symbol,
                  type: TokenType.ERC20,
                  logoURI: token.logoURI,
                  address: addressOnL1,
                  l2Address: address,
                  decimals: token.decimals,
                  tokenLists: []
                }
              } else {
                // The token's L1 address is already on the list, just fill in its L2 address
                acc[addressOnL1].l2Address = address
              }

              const tokenLists = acc[addressOnL1].tokenLists

              if (!tokenLists.includes(tokenList.bridgeTokenListId)) {
                acc[addressOnL1].tokenLists.push(tokenList.bridgeTokenListId)
              }
            }
          }
        })

        return acc
      }, {})
  )
}

export function toERC20BridgeToken(data: L1TokenData): ERC20BridgeToken {
  return {
    name: data.name,
    type: TokenType.ERC20,
    symbol: data.symbol,
    address: data.contract.address,
    decimals: data.decimals
  }
}
