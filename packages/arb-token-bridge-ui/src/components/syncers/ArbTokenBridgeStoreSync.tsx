import { useEffect } from 'react'
import useSWR from 'swr'
import {
  useArbTokenBridge,
  useBalance,
  TokenBridgeParams
} from 'token-bridge-sdk'

import { useActions } from '../../state'

// Syncs the arbTokenBridge data with the global store, so we dont have to drill with props but use store hooks to get data
export function ArbTokenBridgeStoreSync({
  tokenBridgeParams
}: {
  tokenBridgeParams: TokenBridgeParams
}): JSX.Element {
  const actions = useActions()
  const arbTokenBridge = useArbTokenBridge(tokenBridgeParams, false)
  const {
    walletAddress,
    l1: { provider: L1Provider },
    l2: { provider: L2Provider }
  } = tokenBridgeParams

  const [, updateL1Balance] = useBalance({
    provider: L1Provider,
    walletAddress
  })
  const [, updateL2Balance] = useBalance({
    provider: L2Provider,
    walletAddress
  })

  // Refresh balance every 5 secondes
  useSWR(walletAddress + L1Provider.network.chainId, () => updateL1Balance(), {
    refreshInterval: 5000
  })
  useSWR(walletAddress + L2Provider.network.chainId, () => updateL2Balance(), {
    refreshInterval: 5000
  })

  useEffect(() => {
    actions.app.setArbTokenBridge(arbTokenBridge)
  }, [arbTokenBridge])

  return <></>
}
