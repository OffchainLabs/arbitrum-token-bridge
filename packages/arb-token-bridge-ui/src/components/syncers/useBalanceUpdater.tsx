import { useInterval, useLatest } from 'react-use'
import { useAccount } from 'wagmi'

import { useAppState } from '../../state'
import { useUpdateUSDCBalances } from '../../hooks/CCTP/useUpdateUSDCBalances'
import { useSelectedToken } from '../../hooks/useSelectedToken'

// Updates all balances periodically
export function useBalanceUpdater() {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const [selectedToken] = useSelectedToken()
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
