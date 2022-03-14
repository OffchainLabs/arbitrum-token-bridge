import { ERC20BridgeToken, TokenType } from 'token-bridge-sdk'

import { TokenListWithId } from '../../tokenLists'

export interface SearchableToken extends ERC20BridgeToken {
  tokenLists: number[]
}

export type SearchableTokenStorage = { [address: string]: SearchableToken }

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
                allowed: true,
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
                  address: '',
                  l2Address: address,
                  decimals: token.decimals,
                  allowed: true,
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
