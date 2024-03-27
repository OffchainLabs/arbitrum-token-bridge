import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { constants } from 'ethers'

import { useNativeCurrency } from './useNativeCurrency'
import { useBalance } from './useBalance'
import { useNetworksRelationship } from './useNetworksRelationship'
import { useNetworks } from './useNetworks'
import { useAppState } from '../state'

/**
 * `TokenToBridge` means native currency or ERC20 token user wants to bridge
 */
export function useTokenToBeBridgedBalance() {
  const { address: walletAddress } = useAccount()
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const {
    eth: [ethSourceChainBalance],
    erc20: [erc20SourceChainBalances]
  } = useBalance({ provider: networks.sourceChainProvider, walletAddress })

  const childChainNativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })

  return useMemo(() => {
    // user selected source chain native currency or
    // user bridging the destination chain's native currency
    if (!selectedToken) {
      // check if it involves custom orbit chain
      if (childChainNativeCurrency.isCustom) {
        if (isDepositMode) {
          return (
            erc20SourceChainBalances?.[
              childChainNativeCurrency.address.toLowerCase()
            ] ?? constants.Zero
          )
        }
        return ethSourceChainBalance
      }

      return ethSourceChainBalance
    }

    if (!erc20SourceChainBalances) {
      return constants.Zero
    }

    if (isDepositMode) {
      return (
        erc20SourceChainBalances[selectedToken.address.toLowerCase()] ??
        constants.Zero
      )
    }

    const selectedTokenChildChainAddress =
      selectedToken.l2Address?.toLowerCase()

    // token that has never been deposited so it doesn't have an l2Address
    if (!selectedTokenChildChainAddress) {
      return constants.Zero
    }

    // token withdrawal
    return (
      erc20SourceChainBalances[selectedTokenChildChainAddress] ?? constants.Zero
    )
  }, [
    childChainNativeCurrency,
    selectedToken,
    isDepositMode,
    erc20SourceChainBalances,
    ethSourceChainBalance
  ])
}
