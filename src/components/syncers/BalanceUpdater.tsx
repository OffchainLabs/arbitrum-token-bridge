import { useEffect } from 'react'
import { useLatest } from 'react-use'

import { useAppState } from '../../state'

// Updates all balances periodically
const BalanceUpdater = (): JSX.Element => {
  const {
    app: { arbTokenBridge, selectedToken }
  } = useAppState()
  const latestTokenBridge = useLatest(arbTokenBridge)

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

  return <></>
}

export { BalanceUpdater }
