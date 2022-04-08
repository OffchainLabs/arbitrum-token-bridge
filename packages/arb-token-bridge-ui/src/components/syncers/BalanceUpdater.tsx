import { useEffect } from 'react'
import { useLatest } from 'react-use'

import { useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

// Updates all balances periodically
const BalanceUpdater = (): JSX.Element => {
  const {
    l1: { signer: l1Signer },
    l2: { signer: l2Signer }
  } = useNetworksAndSigners()

  const {
    app: { arbTokenBridge, selectedToken }
  } = useAppState()
  const latestTokenBridge = useLatest(arbTokenBridge)

  useEffect(() => {
    const interval = setInterval(() => {
      latestTokenBridge?.current?.eth?.updateBalances()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

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
    latestTokenBridge?.current?.eth?.updateBalances()
  }, [l1Signer, l2Signer])

  return <></>
}

export { BalanceUpdater }
