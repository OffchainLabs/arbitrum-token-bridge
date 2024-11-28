import { useAccount } from 'wagmi'
import { BigNumber, constants } from 'ethers'

import { useBalance } from './useBalance'
import { useNetworksRelationship } from './useNetworksRelationship'
import { useNetworks } from './useNetworks'
import { ERC20BridgeToken } from './arbTokenBridge.types'
import { useNativeCurrencyBalances } from '../components/TransferPanel/TransferPanelMain/useNativeCurrencyBalances'
import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC
} from '../util/TokenUtils'
import { NativeCurrencyEther, isNativeCurrencyEther } from './useNativeCurrency'

/**
 * Balance of the child chain's native currency or ERC20 token
 */
export function useBalanceOnSourceChain(
  token: ERC20BridgeToken | NativeCurrencyEther | null
): BigNumber | null {
  const { address: walletAddress } = useAccount()
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)

  const {
    eth: [ethBalanceSourceChain],
    erc20: [erc20SourceChainBalances]
  } = useBalance({ chainId: networks.sourceChain.id, walletAddress })

  const nativeCurrencyBalances = useNativeCurrencyBalances()

  if (isNativeCurrencyEther(token)) {
    return ethBalanceSourceChain
  }

  // user selected source chain native currency or
  // user bridging the destination chain's native currency
  if (!token) {
    return nativeCurrencyBalances.sourceBalance
  }

  const tokenAddressLowercased = token.address.toLowerCase()

  if (!erc20SourceChainBalances) {
    return constants.Zero
  }

  if (isDepositMode) {
    return erc20SourceChainBalances[tokenAddressLowercased] ?? constants.Zero
  }

  if (
    isTokenArbitrumOneNativeUSDC(tokenAddressLowercased) ||
    isTokenArbitrumSepoliaNativeUSDC(tokenAddressLowercased)
  ) {
    return erc20SourceChainBalances[tokenAddressLowercased] ?? constants.Zero
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
