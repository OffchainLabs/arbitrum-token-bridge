import { useEffect } from 'react'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'

import {
  addBridgeTokenListToBridge,
  BRIDGE_TOKEN_LISTS
} from '../../util/TokenListUtils'
import { useArbTokenBridge } from '../../hooks/useArbTokenBridge'

// Adds whitelisted tokens to the bridge data on app load
// In the token list we should show later only tokens with positive balances
export const useSyncTokenList = () => {
  const arbTokenBridge = useArbTokenBridge()
  const [networks] = useNetworks()
  const { childChain } = useNetworksRelationship(networks)

  useEffect(() => {
    const tokenListsToSet = BRIDGE_TOKEN_LISTS.filter(bridgeTokenList => {
      // Always load the Arbitrum Token token list
      if (bridgeTokenList.isArbitrumTokenTokenList) {
        return true
      }

      return (
        bridgeTokenList.originChainID === childChain.id &&
        bridgeTokenList.isDefault
      )
    })

    tokenListsToSet.forEach(bridgeTokenList => {
      addBridgeTokenListToBridge(bridgeTokenList, arbTokenBridge)
    })
  }, [
    // arbTokenBridge.token is not a memoized object, adding it here would cause infinite loop
    arbTokenBridge.token,
    childChain.id
  ])
}
