import React, { useEffect } from 'react'

import { TokenType } from 'token-bridge-sdk'

import { useAppState } from '../../state'

const BalanceUpdater = (): JSX.Element => {
  const {
    app: { arbTokenBridge, bridge }
  } = useAppState()

  useEffect(() => {
    if (bridge) {
      arbTokenBridge?.balances?.update()
      arbTokenBridge?.token?.updateBalances()
    }
    const interval = setInterval(() => {
      arbTokenBridge?.balances?.update()
      arbTokenBridge?.token?.updateBalances()
    }, 5000)
    return () => clearInterval(interval)
  }, [bridge])

  return <></>
}

export { BalanceUpdater }
