import { useInterval, useLatest } from 'react-use'
import { useAccount } from 'wagmi'

import { useAppState } from '../../state'
import { useUpdateUsdcBalances } from '../../hooks/CCTP/useUpdateUsdcBalancesx'

// Updates all balances periodically
export function useBalanceUpdater() {
  const {
    app: { arbTokenBridge, selectedToken }
  } = useAppState()
  const { address: walletAddress } = useAccount()
  const latestTokenBridge = useLatest(arbTokenBridge)

  const { updateUsdcBalances } = useUpdateUsdcBalances({
    walletAddress
  })

  useInterval(() => {
    updateUsdcBalances()

    if (selectedToken) {
      latestTokenBridge?.current?.token?.updateTokenData(selectedToken.address)
    }
  }, 10000)
}
