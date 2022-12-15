/* 
    Hook and utility functions around maintenence of individual tokens. Using this hook, user can:
    - get the filtered list of tokens - (added by user, by token list, or all)
    - search for a particular token by tokenAddress 
*/

import { useCallback, useMemo } from 'react'
import {
  ContractStorage,
  ERC20BridgeToken,
  L1TokenData,
  TokenListWithId,
  TokenType
} from './arbTokenBridge.types'
import { useTokenLists } from './useTokenLists'

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
            const accAddress = acc[addressOnL1]

            if (!addressOnL1) {
              return
            }

            if (typeof accAddress === 'undefined') {
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
              acc[addressOnL1] = {
                ...accAddress,
                l2Address: address
              }
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

export interface UseTokensParams {
  l1ChainId: number
  l2ChainId: number
  bridgeTokens: ContractStorage<ERC20BridgeToken> | undefined
}

export interface UseTokensResult {
  tokens: ContractStorage<ERC20BridgeToken> // all tokens - tokens from lists or users
  tokensFromLists: ContractStorage<ERC20BridgeToken> // tokens fetched from lists
  tokensFromUser: ContractStorage<ERC20BridgeToken> // tokens added by users
  searchToken(tokenAddress: string): ERC20BridgeToken | null // search for a particular token
}

export function useTokens({
  l1ChainId,
  l2ChainId,
  bridgeTokens
}: UseTokensParams): UseTokensResult {
  const tokenLists = useTokenLists(l2ChainId ? String(l2ChainId) : undefined)

  /* tokens fetched from our standard token list */
  const tokensFromLists = useMemo(() => {
    if (typeof l1ChainId === 'undefined' || typeof l2ChainId === 'undefined') {
      return {}
    }

    return tokenListsToSearchableTokenStorage(
      tokenLists,
      String(l1ChainId),
      String(l2ChainId)
    )
  }, [tokenLists, l1ChainId, l2ChainId])

  /* custom tokens added by the user, different from what are present in our approved lists */
  const tokensFromUser = useMemo(() => {
    const storage: ContractStorage<ERC20BridgeToken> = {}

    // Can happen when switching networks.
    if (typeof bridgeTokens === 'undefined') {
      return {}
    }

    Object.keys(bridgeTokens).forEach((_address: string) => {
      const bridgeToken = bridgeTokens[_address]

      // Any tokens in the bridge that don't have a list id were added by the user.
      if (bridgeToken && bridgeToken.listIds.size === 0) {
        storage[_address] = { ...bridgeToken, listIds: new Set() }
      }
    })

    return storage
  }, [bridgeTokens])

  /* All tokens - list or user */
  const tokens = useMemo(() => {
    return { ...tokensFromLists, ...tokensFromUser }
  }, [tokensFromLists, tokensFromUser])

  const searchToken = (tokenAddress: string): ERC20BridgeToken | null => {
    /*
    function to search for a token within the union of token lists (pre-configured + user added)
    Objective : if basic data like { symbol, name, decimals } is reqd, then why query the chain for the token data already fetched.
    */

    if (!tokenAddress) return null
    return bridgeTokens?.[tokenAddress] || null
  }

  return { tokens, tokensFromLists, tokensFromUser, searchToken }
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
