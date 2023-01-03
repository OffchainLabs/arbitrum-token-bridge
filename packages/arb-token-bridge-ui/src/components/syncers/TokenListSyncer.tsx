import { useEffect } from 'react'

import { useActions, useAppState } from '../../state'
import {
  BRIDGE_TOKEN_LISTS,
  addBridgeTokenListToBridge,
  fetchTokenLists
} from '../../tokenLists'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

// Adds whitelisted tokens to the bridge data on app load
// In the token list we should show later only tokens with positive balances
const TokenListSyncer = (): JSX.Element => {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const {
    l2: { network: l2Network }
  } = useNetworksAndSigners()

  const actions = useActions()

  useEffect(() => {
    if (typeof l2Network === 'undefined') {
      return
    }

    if (!arbTokenBridge?.walletAddress) {
      return
    }

    fetchTokenLists()
      // Add tokens to bridge only after prefetching the token lists
      .then(tokenLists => {
        // set the token lists fetched in app-state
        actions.app.setTokenLists({ value: tokenLists })

        // add the token lists in the bridge
        const tokenListsToSet = BRIDGE_TOKEN_LISTS.filter(
          bridgeTokenList =>
            bridgeTokenList.originChainID === String(l2Network.chainID) &&
            bridgeTokenList.isDefault
        )

        tokenListsToSet.forEach(bridgeTokenList => {
          addBridgeTokenListToBridge(bridgeTokenList, arbTokenBridge)
        })
      })
  }, [arbTokenBridge?.walletAddress, l2Network])

  return <></>
}

export { TokenListSyncer }
