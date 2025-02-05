import { useInterval, useLatest } from 'react-use'
import { useAccount } from 'wagmi'

import { useAppState } from '../../state'
import { isTokenNativeUSDC } from '../../util/TokenUtils'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useUpdateUsdcBalances } from '../../hooks/CCTP/useUpdateUsdcBalances'

// Updates all balances periodically
export function useBalanceUpdater() {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const [selectedToken] = useSelectedToken()
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
