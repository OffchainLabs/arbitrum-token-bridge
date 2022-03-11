import React, { useEffect } from 'react'

import { useAppState } from '../../state'
import {
  BRIDGE_TOKEN_LISTS,
  addBridgeTokenListToBridge,
  fetchTokenLists
} from '../../tokenLists'

// Adds whitelisted tokens to the bridge data on app load
// In the token list we should show later only tokens with positive balances
const TokenListSyncer = (): JSX.Element => {
  const {
    app: { arbTokenBridge, l2NetworkDetails }
  } = useAppState()

  useEffect(() => {
    if (!arbTokenBridge?.walletAddress || !l2NetworkDetails) {
      return
    }

    const { chainID } = l2NetworkDetails

    fetchTokenLists()
      // Add tokens to bridge only after prefetching the token lists
      .then(() => {
        const tokenListsToSet = BRIDGE_TOKEN_LISTS.filter(
          bridgeTokenList =>
            bridgeTokenList.originChainID === chainID &&
            bridgeTokenList.isDefault
        )

        tokenListsToSet.forEach(bridgeTokenList => {
          addBridgeTokenListToBridge(bridgeTokenList, arbTokenBridge)
        })
      })
  }, [arbTokenBridge?.walletAddress, l2NetworkDetails])

  return <></>
}

export { TokenListSyncer }
