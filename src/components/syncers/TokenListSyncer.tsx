import React, { useEffect } from 'react'

import { TokenType } from 'token-bridge-sdk'

import { useAppState } from '../../state'
import tokenListMainnet from '../../util/token-list-42161.json'

// Adds whitelisted tokens to the bridge data on app load
// In the token list we should show later only tokens with positive balances
const TokenListSyncer = (): JSX.Element => {
  const {
    app: { arbTokenBridge, networkID }
  } = useAppState()

  useEffect(() => {
    if (!arbTokenBridge?.walletAddress || !networkID) {
      return
    }
    if (networkID === '1' || networkID === '42161') {
      tokenListMainnet.tokens.forEach(token => {
        try {
          arbTokenBridge?.token?.add(
            networkID === '1'
              ? token.extensions.l1Address.toLowerCase()
              : token.address.toLowerCase(),
            TokenType.ERC20
          )
        } catch (ex) {
          // not interested in ex here for now
        }
      })
    }
  }, [arbTokenBridge?.walletAddress, networkID])

  return <></>
}

export { TokenListSyncer }
