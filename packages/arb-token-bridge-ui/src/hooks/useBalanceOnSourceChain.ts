import { useAccount } from 'wagmi'
import { BigNumber, constants } from 'ethers'

import {
  NativeCurrencyEther,
  isNativeCurrencyEther,
  useNativeCurrency
} from './useNativeCurrency'
import { useBalance } from './useBalance'
import { useNetworksRelationship } from './useNetworksRelationship'
import { useNetworks } from './useNetworks'
import { ERC20BridgeToken } from './arbTokenBridge.types'

/**
 * Balance of the child chain's native currency or ERC20 token
 */
export function useBalanceOnSourceChain(
  token: ERC20BridgeToken | NativeCurrencyEther | null
): BigNumber | null {
  const { address: walletAddress } = useAccount()
  const [networks] = useNetworks()
  const { childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)

  const {
    eth: [ethSourceChainBalance],
    erc20: [erc20SourceChainBalances]
  } = useBalance({ chainId: networks.sourceChain.id, walletAddress })

  const childChainNativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })

  if (isNativeCurrencyEther(token)) {
    return ethSourceChainBalance
  }

  // user selected source chain native currency or
  // user bridging the destination chain's native currency
  if (!token) {
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
      erc20SourceChainBalances[token.address.toLowerCase()] ?? constants.Zero
    )
  }

  const tokenChildChainAddress = token.l2Address?.toLowerCase()

  // token that has never been deposited so it doesn't have an l2Address
  // this should not happen because user shouldn't be able to select it
  if (!tokenChildChainAddress) {
    return constants.Zero
  }

  // token withdrawal
  return erc20SourceChainBalances[tokenChildChainAddress] ?? constants.Zero
}
