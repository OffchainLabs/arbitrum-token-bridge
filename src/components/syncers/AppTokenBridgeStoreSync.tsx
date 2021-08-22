import React, { useEffect } from 'react'

import { Bridge } from 'arb-ts'
import { ArbTokenBridge, useArbTokenBridge } from 'token-bridge-sdk'

import { useActions } from '../../state'

const AppTokenBridgeStoreSync = ({
  bridge
}: {
  bridge: Bridge
}): JSX.Element => {
  const actions = useActions()
  const arbTokenBridge: ArbTokenBridge = useArbTokenBridge(bridge)

  useEffect(() => {
    actions.app.setArbTokenBridge(arbTokenBridge)
  }, [bridge, arbTokenBridge])

  return <></>
}

export { AppTokenBridgeStoreSync }
