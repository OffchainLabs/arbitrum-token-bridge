import React, { useCallback, useContext, useEffect, useRef } from 'react'

import { useLatest } from 'react-use'

import { useAppState } from '../../state'
import { BridgeContext } from '../App/App'

// inspired from https://overreacted.io/making-setinterval-declarative-with-react-hooks/
export const useInterval = <T extends unknown>(
  callback: () => T,
  delay: number
): { forceTrigger: typeof callback } => {
  const savedCallback = useRef(callback)
  const savedTimer = useRef<undefined | NodeJS.Timer>(undefined)

  // Remember the latest callback if it changes.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval.
  useEffect(() => {
    savedTimer.current = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(savedTimer.current!)
  }, [delay])

  const forceTrigger = useCallback(() => {
    clearInterval(savedTimer.current!)
    // make call then setup the timer again
    const res = savedCallback.current()
    savedTimer.current = setInterval(() => savedCallback.current(), delay)
    return res
  }, [delay])

  return { forceTrigger }
}

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
