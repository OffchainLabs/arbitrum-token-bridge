import { useEffect } from 'react'

import { useLatest } from 'react-use'

import { useAppState } from '../../state'
import { useInterval } from '../common/Hooks'

// Updates all balances periodically
const BalanceUpdater = (): JSX.Element => {
  const {
    app: { arbTokenBridge, selectedToken }
  } = useAppState()
  const latestTokenBridge = useLatest(arbTokenBridge)

  const { forceTrigger: forceTriggerBalanceUpdate } = useInterval(() => {
    latestTokenBridge?.current?.eth?.updateBalances()
  }, 5000)

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedToken) {
        latestTokenBridge?.current?.token?.updateTokenData(
          selectedToken.address
        )
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [selectedToken])

  useEffect(() => {
    // trigger an update each time the bridge object changes
    forceTriggerBalanceUpdate()
  }, [arbTokenBridge])

  return <></>
}

export { BalanceUpdater }
