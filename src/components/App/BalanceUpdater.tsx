import React from 'react'
import { useEffect } from 'react'
import { useAppState } from '../../state'

const BalanceUpdater = (): JSX.Element => {
  const {
    app: { arbTokenBridge, bridge }
  } = useAppState()

  useEffect(() => {
    if (bridge) {
      arbTokenBridge?.balances?.update()
    }
    const interval = setInterval(() => {
      arbTokenBridge?.balances?.update()
    }, 5000)
    return () => clearInterval(interval)
  }, [bridge])

  return <></>
}

export { BalanceUpdater }
