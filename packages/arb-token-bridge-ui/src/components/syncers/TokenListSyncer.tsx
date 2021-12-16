import React, { useEffect, useMemo } from 'react'

import axios from 'axios'

import { useAppState, useActions } from '../../state'
import {
  BRIDGE_TOKEN_LISTS,
  addBridgeTokenListToBridge
} from '../../tokenLists'

// Adds whitelisted tokens to the bridge data on app load
// In the token list we should show later only tokens with positive balances
const TokenListSyncer = (): JSX.Element => {
  const {
    app: { arbTokenBridge, networkID, l2NetworkDetails }
  } = useAppState()

  useEffect(() => {
    if (!arbTokenBridge?.walletAddress || !l2NetworkDetails) {
      return
    }
    const { chainID } = l2NetworkDetails
    const tokenListsToSet = BRIDGE_TOKEN_LISTS.filter(
      bridgeTokenList =>
        bridgeTokenList.originChainID === chainID && bridgeTokenList.isDefault
    )
    // we can fetch each list asynchronously
    tokenListsToSet.forEach(bridgeTokenList => {
      addBridgeTokenListToBridge(bridgeTokenList, arbTokenBridge)
    })
  }, [arbTokenBridge?.walletAddress, l2NetworkDetails])

  return <></>
}

export { TokenListSyncer }
