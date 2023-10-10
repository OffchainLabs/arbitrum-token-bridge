import { useEffect } from 'react'
import { useAccount } from 'wagmi'

import { useAppState } from '../../state'
import {
  addBridgeTokenListToBridge,
  BRIDGE_TOKEN_LISTS
} from '../../util/TokenListUtils'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

// Adds whitelisted tokens to the bridge data on app load
// In the token list we should show later only tokens with positive balances
const TokenListSyncer = (): JSX.Element => {
  const {
    app: { arbTokenBridge, arbTokenBridgeLoaded }
  } = useAppState()
  const { address: walletAddress } = useAccount()
  const {
    l2: { network: l2Network }
  } = useNetworksAndSigners()

  useEffect(() => {
    if (typeof l2Network === 'undefined') {
      return
    }

    if (!arbTokenBridgeLoaded) {
      return
    }

    if (!walletAddress) {
      return
    }

    const tokenListsToSet = BRIDGE_TOKEN_LISTS.filter(bridgeTokenList => {
      // Always load the Arbitrum Token token list
      if (bridgeTokenList.isArbitrumTokenTokenList) {
        return true
      }

      return (
        bridgeTokenList.originChainID === l2Network.id &&
        bridgeTokenList.isDefault
      )
    })

    tokenListsToSet.forEach(bridgeTokenList => {
      addBridgeTokenListToBridge(bridgeTokenList, arbTokenBridge)
    })
  }, [walletAddress, l2Network, arbTokenBridgeLoaded])

  return <></>
}

export { TokenListSyncer }
