import { useEffect } from 'react'

import { useAppState } from '../../state'
import {
  BRIDGE_TOKEN_LISTS,
  addBridgeTokenListToBridge
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

  useEffect(() => {
    if (typeof l2Network === 'undefined') {
      return
    }

    if (!arbTokenBridge?.walletAddress) {
      return
    }

    const tokenListsToSet = BRIDGE_TOKEN_LISTS.filter(
      bridgeTokenList =>
        bridgeTokenList.originChainID === l2Network.chainID &&
        bridgeTokenList.isDefault
    )

    tokenListsToSet.forEach(bridgeTokenList => {
      addBridgeTokenListToBridge(bridgeTokenList, arbTokenBridge)
    })
  }, [arbTokenBridge?.walletAddress, l2Network])

  return <></>
}

export { TokenListSyncer }
