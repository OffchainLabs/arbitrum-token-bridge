import { useEffect, useState } from 'react'
import axios from 'axios'
import { TokenList } from '@uniswap/token-lists'
import {
  ArbTokenBridge,
  ContractStorage,
  ERC20BridgeToken,
  L1TokenData,
  TokenType
} from '../hooks/arbTokenBridge.types'
import { validateTokenList } from '../util'

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
    url: 'https://tokenlist.arbitrum.io/ArbTokenLists/arbed_arb_whitelist_era.json',
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
    url: '/token-list-421611.json',
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
  },
  {
    id: 8,
    originChainID: '421613',
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
        .map(({ data }, index) => {
          const token = BRIDGE_TOKEN_LISTS[index]
          if (!token) {
            return data
          }

          return {
            l2ChainId: token.originChainID,
            bridgeTokenListId: token.id,
            ...data
          }
        })

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

export function tokenListsToSearchableTokenStorage(
  tokenLists: TokenListWithId[],
  l1ChainId: string,
  l2ChainId: string
): ContractStorage<ERC20BridgeToken> {
  return tokenLists.reduce(
    (acc: ContractStorage<ERC20BridgeToken>, tokenList: TokenListWithId) => {
      tokenList.tokens.forEach(token => {
        const address = token.address.toLowerCase()
        const stringifiedChainId = String(token.chainId)
        const accAddress = acc[address]

        if (stringifiedChainId === l1ChainId) {
          // The address is from an L1 token
          if (typeof accAddress === 'undefined') {
            // First time encountering the token through its L1 address
            acc[address] = {
              ...token,
              type: TokenType.ERC20,
              l2Address: undefined,
              listIds: new Set()
            }
          } else {
            // Token was already added to the map through its L2 token
            acc[address] = {
              ...accAddress,
              address
            }
          }

          // acc[address] was defined in the if/else above
          acc[address]!.listIds.add(tokenList.bridgeTokenListId)
        } else if (stringifiedChainId === l2ChainId) {
          // The token is an L2 token

          if (!token.extensions?.bridgeInfo) {
            return
          }

          // @ts-ignore TODO
          // TODO: should we upgrade '@uniswap/token-lists'?
          const bridgeInfo: {
            [chainId: string]: { tokenAddress: string }
          } = token.extensions.bridgeInfo

          const l1Bridge = bridgeInfo[l1ChainId]
          if (l1Bridge) {
            const addressOnL1 = l1Bridge.tokenAddress.toLowerCase()

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
                listIds: new Set()
              }
            } else {
              // The token's L1 address is already on the list, just fill in its L2 address
              acc[addressOnL1]!.l2Address = address
            }

            // acc[address] was defined in the if/else above
            acc[addressOnL1]!.listIds.add(tokenList.bridgeTokenListId)
          }
        }
      })

      return acc
    },
    {}
  )
}

export function toERC20BridgeToken(data: L1TokenData): ERC20BridgeToken {
  return {
    name: data.name,
    type: TokenType.ERC20,
    symbol: data.symbol,
    address: data.contract.address,
    decimals: data.decimals,
    listIds: new Set()
  }
}
