import { useEffect, useMemo } from 'react'
import {
  useArbTokenBridge,
  TokenBridgeParams
} from '../../hooks/useArbTokenBridge'

import { useActions } from '../../state'

// Syncs the arbTokenBridge data with the global store, so we dont have to drill with props but use store hooks to get data
export function ArbTokenBridgeStoreSync({
  tokenBridgeParams
}: {
  tokenBridgeParams: TokenBridgeParams
}): JSX.Element {
  const actions = useActions()
  const arbTokenBridge = useArbTokenBridge(tokenBridgeParams)
  const arbTokenBridgeKey = JSON.stringify(arbTokenBridge)
  const memoizedArbTokenBridge = useMemo(
    () => arbTokenBridge,
    [arbTokenBridgeKey]
  )

  useEffect(() => {
    if (arbTokenBridge) {
      actions.app.setArbTokenBridge(arbTokenBridge)
    }
  }, [memoizedArbTokenBridge])

  return <></>
}
