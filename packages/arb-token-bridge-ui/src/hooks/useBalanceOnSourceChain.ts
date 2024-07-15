import { useAccount } from 'wagmi'
import { BigNumber, constants } from 'ethers'

import { useNativeCurrency } from './useNativeCurrency'
import { useBalance } from './useBalance'
import { useNetworksRelationship } from './useNetworksRelationship'
import { useNetworks } from './useNetworks'
import { ERC20BridgeToken } from './arbTokenBridge.types'

/**
 * Balance of the child chain's native currency or ERC20 token
 */
export function useBalanceOnSourceChain(token: ERC20BridgeToken | null): {
  balance: BigNumber | null
  isLoading: boolean
} {
  const { address: walletAddress } = useAccount()
  const [networks] = useNetworks()
  const { childChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const {
    eth: [ethSourceChainBalance, , isRefetchingEthBalance],
    erc20: [erc20SourceChainBalances, , isRefetchingErc20Balance]
  } = useBalance({ provider: networks.sourceChainProvider, walletAddress })

  const childChainNativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })

  // user selected source chain native currency or
  // user bridging the destination chain's native currency
  if (!token) {
    // check if user is depositing destination chain's custom native currency to orbit chain
    if (childChainNativeCurrency.isCustom && isDepositMode) {
      return {
        balance:
          erc20SourceChainBalances?.[
            childChainNativeCurrency.address.toLowerCase()
          ] ?? constants.Zero,
        isLoading: isRefetchingErc20Balance
      }
    }

    // `ethSourceChainBalance` is the ETH balance at source chain when ETH is selected for bridging,
    // or the custom gas native currency balance when withdrawing the native currency
    return { balance: ethSourceChainBalance, isLoading: isRefetchingEthBalance }
  }

  if (!erc20SourceChainBalances) {
    return {
      balance: constants.Zero,
      isLoading: isRefetchingEthBalance
    }
  }

  if (isDepositMode) {
    return {
      balance:
        erc20SourceChainBalances[token.address.toLowerCase()] ?? constants.Zero,
      isLoading: isRefetchingErc20Balance
    }
  }

  const tokenChildChainAddress = token.l2Address?.toLowerCase()

  // token that has never been deposited so it doesn't have an l2Address
  // this should not happen because user shouldn't be able to select it
  if (!tokenChildChainAddress) {
    return { balance: constants.Zero, isLoading: false }
  }

  // token withdrawal
  return {
    balance: erc20SourceChainBalances[tokenChildChainAddress] ?? constants.Zero,
    isLoading: isRefetchingErc20Balance
  }
}
