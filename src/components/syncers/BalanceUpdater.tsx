import React, { useContext, useEffect } from 'react'

import { useLatest } from 'react-use'

import { useAppState } from '../../state'
import { BridgeContext } from '../App/App'

// Updates all balances periodically
const BalanceUpdater = (): JSX.Element => {
  const bridge = useContext(BridgeContext)
  const {
    app: { arbTokenBridge, selectedToken }
  } = useAppState()
  const latestTokenBridge = useLatest(arbTokenBridge)
  const latestBridge = useLatest(bridge)

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
