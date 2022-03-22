import React, { useEffect } from 'react'

import { ArbTokenBridge, useArbTokenBridge, Bridge } from 'token-bridge-sdk'

import { useActions } from '../../state'

// Syncs the arbTokenBridge data with the global store, so we dont have to drill with props but use store hooks to get data
const ArbTokenBridgeStoreSync = ({
  bridge
}: {
  bridge: Bridge
}): JSX.Element => {
  const actions = useActions()
  const arbTokenBridge: ArbTokenBridge = useArbTokenBridge(
    bridge,
    false,
    bridge.l1Signer,
    bridge.l2Signer
  )

  useEffect(() => {
    actions.app.setArbTokenBridge(arbTokenBridge)
  }, [bridge, arbTokenBridge])

  return <></>
}

export { ArbTokenBridgeStoreSync }
