import React, { useCallback, useContext, useEffect, useRef } from 'react'

import { useLatest } from 'react-use'

import { useAppState } from '../../state'
import { BridgeContext } from '../App/App'
import { useInterval } from '../common/Hooks'

// Updates all balances periodically
const BalanceUpdater = (): JSX.Element => {
  const bridge = useContext(BridgeContext)
  const {
    app: { arbTokenBridge, selectedToken }
  } = useAppState()
  const latestTokenBridge = useLatest(arbTokenBridge)
  const latestBridge = useLatest(bridge)
  const { forceTrigger: forceTriggerBalanceUpdate } = useInterval(() => {
    if (latestBridge.current) {
      latestTokenBridge?.current?.eth?.updateBalances()
    }
  }, 5000)

  useEffect(() => {
    const interval = setInterval(() => {
      if (latestBridge.current && selectedToken) {
        latestTokenBridge?.current?.token?.updateTokenData(
          selectedToken.address
        )
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [latestBridge, selectedToken])

  useEffect(() => {
    // trigger an update each time the bridge object changes
    forceTriggerBalanceUpdate()
  }, [bridge])

  return <></>
}

export { BalanceUpdater }
