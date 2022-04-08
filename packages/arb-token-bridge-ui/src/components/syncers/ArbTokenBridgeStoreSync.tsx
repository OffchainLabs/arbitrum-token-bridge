import { useEffect } from 'react'
import { useArbTokenBridge, TokenBridgeParams } from 'token-bridge-sdk'

import { useActions } from '../../state'

// Syncs the arbTokenBridge data with the global store, so we dont have to drill with props but use store hooks to get data
export function ArbTokenBridgeStoreSync({
  tokenBridgeParams
}: {
  tokenBridgeParams: TokenBridgeParams
}): JSX.Element {
  const actions = useActions()
  const arbTokenBridge = useArbTokenBridge(tokenBridgeParams, false)

  useEffect(() => {
    actions.app.setArbTokenBridge(arbTokenBridge)
  }, [arbTokenBridge])

  return <></>
}
