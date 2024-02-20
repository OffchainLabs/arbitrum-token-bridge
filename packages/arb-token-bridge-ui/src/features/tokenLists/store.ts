import { create } from 'zustand'
import { ChainId } from '../../util/networks'
import { ImageProps } from 'next/image'

export interface BridgeTokenList {
  id: number
  chainIds: number[]
  url: string
  name: string
  isDefault: boolean
  isArbitrumTokenTokenList?: boolean
  logoURI: ImageProps['src']
}

export const BRIDGE_TOKEN_LISTS: BridgeTokenList[] = [
  {
    id: 1,
    chainIds: [
      ChainId.Ethereum,
      ChainId.ArbitrumOne,
      ChainId.ArbitrumNova,
      660279, // Xai
      1380012617 // Rari
    ],
    url: '/api/tokenlist?listId=1',
    name: 'Arbitrum Whitelist Era',
    isDefault: true,
    logoURI: '/public/images/explore-arbitrum/defi/1inch.webp' // TODO: fix
  }
]

export type CrossChainTokenInfo = {
  address: string
  chainId: number
  decimals: number
  logoURI: string
  name: string
  symbol: string
  // TODO: this is incorrect, we return an object (do we need to?)
  bridgeInfo: {
    [chainId: string]: string
  }
}

export type TokensMap = { [tokenAddress: string]: CrossChainTokenInfo }
export type TokenListMap = {
  [chainId: string]: { [tokenAddress: string]: CrossChainTokenInfo }
}
export type TokenListMapWithListIds = {
  [chainId: string]: {
    [tokenAddress: string]: CrossChainTokenInfo & { listIds: Set<number> }
  }
}

type TokenListsStore = {
  tokens: TokenListMapWithListIds
  tokenLists: Set<number>
  addTokenList(listId: number): Promise<TokenListMapWithListIds>
  removeTokenList(listId: number): void
}
export const useTokenListsStore = create<TokenListsStore>(set => ({
  tokens: {},
  tokenLists: new Set<number>(),
  async addTokenList(listId: number) {
    // Fetch token list
    const list = BRIDGE_TOKEN_LISTS.find(list => list.id === listId)
    if (!list) {
      throw new Error(`List ${listId} not found`)
    }

    const response = await fetch(list.url, {
      method: 'GET'
    })

    // TODO: handle errors
    const { data: tokenList }: { data: TokenListMap } = await response.json()

    let tokens: TokenListMapWithListIds = {}
    set(state => {
      if (state.tokenLists.has(listId)) {
        return {}
      }

      // Map over all chainIds for the tokenlist
      tokens = { ...state.tokens }
      Object.keys(tokenList).forEach(chainId => {
        tokens[chainId] = tokens[chainId] || {}
        const tokensForChainId = tokenList[chainId]
        if (!tokensForChainId) {
          return {}
        }

        // Map over all the token for the given chainId and add them to the state
        Object.keys(tokensForChainId).forEach(tokenAddress => {
          const token = tokensForChainId[tokenAddress]
          if (!token) {
            return {}
          }

          // If the token exist in the state already, only update the listIds
          // bridgeInfo for a given token is the same for all tokenLists
          // TODO: cleanup
          const tokenFromState = tokens[chainId]![tokenAddress]
          const t = tokenFromState || token
          const set = t.listIds || new Set<number>()
          t.listIds = set.add(listId)
          tokens[chainId] = tokens[chainId] || {}
          tokens[chainId][tokenAddress.toLowerCase()] = t
        })
      })
      return {
        tokens,
        tokenLists: state.tokenLists.add(listId)
      }
    })

    // Return tokens, so we can await addTokenList and get the tokens if needed
    return tokens
  },
  removeTokenList(listId: number) {
    const list = BRIDGE_TOKEN_LISTS.find(list => list.id === listId)
    if (!list) {
      throw new Error(`List ${listId} not found`)
    }

    set(state => {
      const tokens = { ...state.tokens }
      Object.keys(tokens).forEach(chainId => {
        const tokensForChainId = tokens[chainId]
        if (!tokensForChainId) {
          return
        }

        Object.keys(tokensForChainId).forEach(tokenAddress => {
          const token = tokensForChainId[tokenAddress]
          if (!token) {
            return
          }

          if (token.listIds.has(listId)) {
            token.listIds.delete(listId)
            if (token.listIds.size === 0) {
              delete tokens[chainId]![tokenAddress]
            }
          }
        })
      })

      return {
        tokens,
        tokenLists: new Set([...state.tokenLists].filter(id => id !== listId))
      }
    })

    set(state => ({
      ...state,
      [listId]: false
    }))
  }
}))
