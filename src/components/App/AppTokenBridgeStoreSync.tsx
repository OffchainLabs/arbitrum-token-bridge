import React from 'react'
import { ArbTokenBridge } from '../../types/ArbTokenBridge'
import { useArbTokenBridge } from 'token-bridge-sdk'
import { useActions } from '../../state'
import { useEffect } from 'react'
import { Bridge } from 'arb-ts'

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
