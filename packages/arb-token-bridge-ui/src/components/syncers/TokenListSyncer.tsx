import useSWRImmutable from 'swr/immutable'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'

import { useAppState } from '../../state'
import {
  addBridgeTokenListToBridge,
  BRIDGE_TOKEN_LISTS
} from '../../util/TokenListUtils'

// Adds whitelisted tokens to the bridge data on app load
// In the token list we should show later only tokens with positive balances
const TokenListSyncer = (): JSX.Element => {
  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChain } = useNetworksRelationship(networks)

  useSWRImmutable(
    arbTokenBridgeLoaded ? [childChain.id, 'TokenListSyncer'] : null,
    ([_childChainId]) => {
      const tokenListsToSet = BRIDGE_TOKEN_LISTS.filter(bridgeTokenList => {
        // Always load the Arbitrum Token token list
        if (bridgeTokenList.isArbitrumTokenTokenList) {
          return true
        }

        return (
          bridgeTokenList.originChainID === _childChainId &&
          bridgeTokenList.isDefault
        )
      })

      tokenListsToSet.forEach(bridgeTokenList => {
        addBridgeTokenListToBridge(bridgeTokenList, arbTokenBridge)
      })
    }
  )

  return <></>
}

export { TokenListSyncer }
