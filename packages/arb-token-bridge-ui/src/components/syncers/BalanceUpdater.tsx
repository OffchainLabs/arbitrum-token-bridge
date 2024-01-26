import { useEffect } from 'react'
import { useLatest } from 'react-use'

import { useAppState } from '../../state'
import { useArbTokenBridge } from '../../hooks/useArbTokenBridge'

// Updates all balances periodically
const BalanceUpdater = (): JSX.Element => {
  const {
    app: { selectedToken }
  } = useAppState()
  const { token } = useArbTokenBridge()

  useEffect(() => {
    console.log('TOKEN', token)
  }, [token])
  const latestToken = useLatest(token)

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedToken) {
        latestToken?.current?.updateTokenData(selectedToken.address)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [latestToken, selectedToken])

  return <></>
}

export { BalanceUpdater }
