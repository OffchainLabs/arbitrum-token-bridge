import { useMemo } from 'react'
import {
  ContractStorage,
  ERC20BridgeToken,
  L1TokenData,
  TokenType
} from 'token-bridge-sdk'

import { useAppState } from '../../state'
import { TokenListWithId, useTokenLists } from '../../tokenLists'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

export function useTokensFromLists(): ContractStorage<ERC20BridgeToken> {
  const {
    l1: { network: l1Network },
    l2: { network: l2Network }
  } = useNetworksAndSigners()

  const tokenLists = useTokenLists(
    l2Network ? String(l2Network.chainID) : undefined
  )

  return useMemo(() => {
    if (typeof l1Network === 'undefined' || typeof l2Network === 'undefined') {
      return {}
    }

    return tokenListsToSearchableTokenStorage(
      tokenLists,
      String(l1Network.chainID),
      String(l2Network.chainID)
    )
  }, [tokenLists, l1Network, l2Network])
}

export function useTokensFromUser(): ContractStorage<ERC20BridgeToken> {
  const {
    app: {
      arbTokenBridge: { bridgeTokens }
    }
  } = useAppState()

  return useMemo(() => {
    const storage: ContractStorage<ERC20BridgeToken> = {}

    // Can happen when switching networks.
    if (typeof bridgeTokens === 'undefined') {
      return {}
    }

    Object.keys(bridgeTokens).forEach((_address: string) => {
      const bridgeToken = bridgeTokens[_address]

      // Any tokens in the bridge that don't have a list id were added by the user.
      if (bridgeToken && !bridgeToken.listIds.size) {
        storage[_address] = { ...bridgeToken, listIds: new Set() }
      }
    })

    return storage
  }, [bridgeTokens])
}

function tokenListsToSearchableTokenStorage(
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

          // @ts-ignore
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
