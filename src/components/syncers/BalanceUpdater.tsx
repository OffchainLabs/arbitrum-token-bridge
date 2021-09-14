import React, { useContext, useEffect } from 'react'

import { useLatest } from 'react-use'

import { useAppState } from '../../state'
import { BridgeContext } from '../App/App'

// Updates all balances periodically
const BalanceUpdater = (): JSX.Element => {
  const bridge = useContext(BridgeContext)
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const latestTokenBridge = useLatest(arbTokenBridge)
  const latestBridge = useLatest(bridge)

  useEffect(() => {
    latestTokenBridge?.current?.balances?.update()
  }, [bridge])

  useEffect(() => {
    if (latestBridge.current) {
      latestTokenBridge?.current?.eth?.updateBalances()
    }
    const interval = setInterval(() => {
      if (latestBridge.current) {
        latestTokenBridge?.current?.eth?.updateBalances()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [bridge])

  return <></>
}

export { BalanceUpdater }
