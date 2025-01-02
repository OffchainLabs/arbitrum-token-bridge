import { useInterval, useLatest } from 'react-use'
import { useAccount } from 'wagmi'

import { useAppState } from '../../state'
import { useUpdateUSDCBalances } from '../../hooks/CCTP/useUpdateUSDCBalances'

// Updates all balances periodically
export function useBalanceUpdater() {
  const {
    app: { arbTokenBridge, selectedToken }
  } = useAppState()
  const { address: walletAddress } = useAccount()
  const latestTokenBridge = useLatest(arbTokenBridge)

  const { updateUSDCBalances } = useUpdateUSDCBalances({
    walletAddress
  })

  useInterval(() => {
    updateUSDCBalances()

    if (selectedToken) {
      latestTokenBridge?.current?.token?.updateTokenData(selectedToken.address)
    }
  }, 10000)
}
