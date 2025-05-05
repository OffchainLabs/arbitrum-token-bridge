import { useMemo } from 'react'
import { useInterval, useLatest, useDebounce } from 'react-use'
import { useAccount } from 'wagmi'

import { useAppState } from '../../state'
import { isTokenNativeUSDC } from '../../util/TokenUtils'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { useUpdateUsdcBalances } from '../../hooks/CCTP/useUpdateUsdcBalances'
import { useBalances } from '../../hooks/useBalances'

// Updates all balances periodically
export function useBalanceUpdater() {
  const {
    app: { arbTokenBridge }
  } = useAppState()

  const [selectedToken] = useSelectedToken()
  const { address: walletAddress } = useAccount()
  const latestTokenBridge = useLatest(arbTokenBridge)
  const { bridgeTokens } = latestTokenBridge.current

  const { updateErc20ParentBalances, updateErc20ChildBalances } = useBalances({
    parentWalletAddress: walletAddress,
    childWalletAddress: walletAddress
  })

  const { updateUsdcBalances } = useUpdateUsdcBalances({
    walletAddress
  })

  const parentErc20Addresses = useMemo(
    () =>
      (bridgeTokens
        ? Object.keys(bridgeTokens ?? {}).map(key => bridgeTokens[key]?.address)
        : []
      ).filter((address): address is string => address !== undefined),
    [bridgeTokens]
  )

  const childErc20Addresses = useMemo(
    () =>
      (bridgeTokens
        ? Object.keys(bridgeTokens ?? {}).map(
            key => bridgeTokens[key]?.l2Address
          )
        : []
      ).filter((address): address is string => address !== undefined),
    [bridgeTokens]
  )

  // when the wallet address changes / wallet is freshly connected, fetch and update balances of all tokens held by user
  useDebounce(
    () => {
      if (walletAddress) {
        updateErc20ParentBalances(parentErc20Addresses)
        updateErc20ChildBalances(childErc20Addresses)
      }
    },
    100, // debounce while tokens from lists are being added inside the bridge
    [walletAddress, parentErc20Addresses, childErc20Addresses]
  )

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
