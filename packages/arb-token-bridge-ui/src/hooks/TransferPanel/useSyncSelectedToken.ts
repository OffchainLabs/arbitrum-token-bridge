import { useEffect } from 'react'

import { useTokenLists } from '../useTokenLists'
import { useActions, useAppState } from '../../state'
import { useNetworksAndSigners } from '../useNetworksAndSigners'

export const useSyncSelectedToken = () => {
  const {
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const {
    app: {
      selectedToken,
      arbTokenBridge: { token, bridgeTokens }
    }
  } = useAppState()
  const actions = useActions()
  const { data: allTokenLists = [] } = useTokenLists(l2Network.id)

  useEffect(() => {
    // This hook syncs the selected token's data when the bridge token data are updated, e.g. when the l2 network changes and the token's l2 address is changed
    if (allTokenLists.length === 0) {
      return
    }

    // if the `updateTokenData` is not ready
    if (!token) {
      return
    }

    // if there is no selected token, no need to sync
    if (!selectedToken) {
      return
    }

    // if the selected token l2 address is not the same as the L2 bridge tokens
    if (
      selectedToken.l2Address !==
      bridgeTokens?.[selectedToken.address]?.l2Address
    ) {
      token.updateTokenData(selectedToken.address)
      actions.app.setSelectedToken(
        bridgeTokens?.[selectedToken.address] || null
      )
    }
  }, [allTokenLists, selectedToken, bridgeTokens, token])
}
