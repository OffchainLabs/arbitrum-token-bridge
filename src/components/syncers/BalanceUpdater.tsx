import React, { useContext, useEffect } from 'react'

import { useLatest } from 'react-use'

import { useAppState } from '../../state'
import { BridgeContext } from '../App/App'

const BalanceUpdater = (): JSX.Element => {
  const bridge = useContext(BridgeContext)
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const latestTokenBridge = useLatest(arbTokenBridge)
  const latestBridge = useLatest(bridge)

  useEffect(() => {
    latestTokenBridge?.current?.balances?.update()
    const interval = setInterval(() => {
      if (latestBridge.current) {
        latestTokenBridge?.current?.balances?.update()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [bridge])

  return <></>
}

export { BalanceUpdater }
