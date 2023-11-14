import { useEffect } from 'react'

import { useAppState } from '../../state'
import { addBridgeTokenListToBridge } from '../../util/TokenListUtils'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useTokenLists } from '../../hooks/useTokenLists'

// Adds whitelisted tokens to the bridge data on app load
// In the token list we should show later only tokens with positive balances
const TokenListSyncer = (): JSX.Element => {
  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded }
  } = useAppState()
  const {
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const { data: tokenLists = [] } = useTokenLists(l2Network.id, true)

  useEffect(() => {
    if (!arbTokenBridgeLoaded) {
      return
    }

    if (tokenLists.length === 0) {
      return
    }

    tokenLists.forEach(bridgeTokenList => {
      addBridgeTokenListToBridge(bridgeTokenList, arbTokenBridge, l2Network.id)
    })
  }, [arbTokenBridgeLoaded, tokenLists, l2Network.id])

  return <></>
}

export { TokenListSyncer }
