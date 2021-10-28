import React, { useEffect } from 'react'

import { Bridge } from 'token-bridge-sdk'

import { useActions } from '../../state'
import { WhiteListState } from '../../state/app/state'
import { MAINNET_WHITELIST_ADDRESS } from '../../util/networks'

// Checks if address is whitelisted for the mainnet
const WhiteListUpdater = ({
  bridge,
  walletAddress,
  chainID
}: {
  bridge: Bridge | null
  walletAddress?: string | null
  chainID?: number
}): JSX.Element => {
  const actions = useActions()

  useEffect(() => {
    if (!walletAddress || !chainID || !bridge) {
      return
    }
    if (chainID !== 1) {
      actions.app.setWhitelistState(WhiteListState.ALLOWED)
    } else {
      bridge
        ?.isWhiteListed(walletAddress, MAINNET_WHITELIST_ADDRESS)
        ?.then(isAllowed => {
          actions.app.setWhitelistState(
            isAllowed ? WhiteListState.ALLOWED : WhiteListState.DISALLOWED
          )
        })
    }
  }, [bridge, walletAddress, chainID])

  return <></>
}

export { WhiteListUpdater }
