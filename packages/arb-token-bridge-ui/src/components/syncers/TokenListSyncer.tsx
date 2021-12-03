import React, { useEffect } from 'react'

import { useAppState, useActions } from '../../state'

// Adds whitelisted tokens to the bridge data on app load
// In the token list we should show later only tokens with positive balances
const TokenListSyncer = (): JSX.Element => {
  const {
    app: { arbTokenBridge, networkID, l2NetworkDetails }
  } = useAppState()
  const actions = useActions()

  useEffect(() => {
    if (!arbTokenBridge?.walletAddress || !l2NetworkDetails) {
      return
    }
    const { chainID } = l2NetworkDetails

    const tokenListName = (() => {
      switch (chainID) {
        case '42161':
          return 'token-list-42161.json'
        case '421611':
          return 'token-list-421611.json'
        default:
          console.warn('No list for current network')
      }
    })()
    if (!tokenListName) return
    fetch(tokenListName)
      .then(response => {
        return response.json()
      })
      .then(tokenListData => {
        return arbTokenBridge.token.addTokensStatic(tokenListData)
      })
  }, [arbTokenBridge?.walletAddress, l2NetworkDetails])

  return <></>
}

export { TokenListSyncer }
