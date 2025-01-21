import { useInterval, useLatest } from 'react-use'
import { useAccount } from 'wagmi'

import { useAppState } from '../../state'
import { useUpdateUsdcBalances } from '../../hooks/CCTP/useUpdateUsdcBalances'
import { isTokenNativeUSDC } from '../../util/TokenUtils'

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
    if (selectedToken) {
      if (isTokenNativeUSDC(selectedToken.address)) {
        updateUsdcBalances()
        return
      }

      latestTokenBridge?.current?.token?.updateTokenData(selectedToken.address)
    }
  }, 10000)
}
