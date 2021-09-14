import React, { useEffect } from 'react'

import { TokenType } from 'token-bridge-sdk'

import { useAppState } from '../../state'
import tokenListMainnet from '../../util/token-list-42161.json'
import tokenListRinkeby from '../../util/token-list-421611.json'

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
      arbTokenBridge.token.addTokensStatic(tokenListMainnet)
    } else if (networkID == '4' || networkID === '421611') {
      arbTokenBridge.token.addTokensStatic(tokenListRinkeby)
    }
  }, [arbTokenBridge?.walletAddress, networkID])

  return <></>
}

export { TokenListSyncer }
