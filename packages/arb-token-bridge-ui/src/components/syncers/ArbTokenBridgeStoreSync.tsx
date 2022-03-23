import { useEffect } from 'react'

import {
  Bridge,
  useArbTokenBridge,
  TokenBridgeParams,
  ArbTokenBridge
} from 'token-bridge-sdk'

import { useActions } from '../../state'

// Syncs the arbTokenBridge data with the global store, so we dont have to drill with props but use store hooks to get data
export function ArbTokenBridgeStoreSync({
  bridge,
  tokenBridgeParams
}: {
  bridge: Bridge
  tokenBridgeParams: TokenBridgeParams
}): JSX.Element {
  const actions = useActions()
  const arbTokenBridge: ArbTokenBridge = useArbTokenBridge(
    bridge,
    false,
    tokenBridgeParams
  )

  useEffect(() => {
    actions.app.setArbTokenBridge(arbTokenBridge)
  }, [bridge, arbTokenBridge])

  return <></>
}
