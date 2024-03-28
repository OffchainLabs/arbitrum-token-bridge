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

  // user selected source chain native currency or
  // user bridging the destination chain's native currency
  if (!selectedToken) {
    // check if user is depositing destination chain's custom native currency to orbit chain
    if (childChainNativeCurrency.isCustom && isDepositMode) {
      return (
        erc20SourceChainBalances?.[
          childChainNativeCurrency.address.toLowerCase()
        ] ?? constants.Zero
      )
    }

    // `ethSourceChainBalance` is the ETH balance at source chain when ETH is selected for bridging,
    // or the custom gas native currency balance when withdrawing the native currency
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

  const selectedTokenChildChainAddress = selectedToken.l2Address?.toLowerCase()

  // token that has never been deposited so it doesn't have an l2Address
  // this should not happen because user shouldn't be able to select it
  if (!selectedTokenChildChainAddress) {
    return constants.Zero
  }

  // token withdrawal
  return (
    erc20SourceChainBalances[selectedTokenChildChainAddress] ?? constants.Zero
  )
}
