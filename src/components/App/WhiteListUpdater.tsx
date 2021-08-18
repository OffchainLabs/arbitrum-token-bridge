import React from 'react'
import { useEffect } from 'react'
import { MAINNET_WHITELIST_ADDRESS } from './networks'
import { useActions, useAppState } from '../../state'

import { WhiteListState } from '../../state/app/state'

const WhiteListUpdater = (): JSX.Element => {
  const actions = useActions()
  const {
    app: { bridge, l1NetworkDetails, arbTokenBridge }
  } = useAppState()

  useEffect(() => {
    console.log('arbTokenBridge()?.balances', arbTokenBridge?.walletAddress)

    // if (!arbTokenBridge?.walletAddress) return
    if (l1NetworkDetails?.chainID !== '1') {
      actions.app.setWhitelistState(WhiteListState.ALLOWED)
    } else {
      bridge
        ?.isWhiteListed(arbTokenBridge.walletAddress, MAINNET_WHITELIST_ADDRESS)
        ?.then(isAllowed => {
          actions.app.setWhitelistState(
            isAllowed ? WhiteListState.ALLOWED : WhiteListState.DISALLOWED
          )
        })
    }
  }, [l1NetworkDetails?.chainID, bridge])
  return <></>
}

export { WhiteListUpdater }
