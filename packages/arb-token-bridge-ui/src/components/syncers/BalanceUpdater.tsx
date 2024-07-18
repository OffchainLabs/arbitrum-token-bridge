import { useEffect } from 'react'
import { useLatest } from 'react-use'
import { useAccount } from 'wagmi'

import { useAppState } from '../../state'
import { useUpdateUSDCBalances } from '../../hooks/CCTP/useUpdateUSDCBalances'

// Updates all balances periodically
const BalanceUpdater = (): JSX.Element => {
  const {
    app: { arbTokenBridge, selectedToken }
  } = useAppState()
  const { address: walletAddress } = useAccount()
  const latestTokenBridge = useLatest(arbTokenBridge)

  const { updateUSDCBalances } = useUpdateUSDCBalances({
    walletAddress
  })

  useEffect(() => {
    const interval = setInterval(() => {
      updateUSDCBalances()

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
