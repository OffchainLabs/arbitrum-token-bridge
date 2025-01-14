import { useAccount } from 'wagmi'
import { BigNumber, constants } from 'ethers'

import { useBalance } from './useBalance'
import { useNetworks } from './useNetworks'
import { ERC20BridgeToken } from './arbTokenBridge.types'
import { useNativeCurrencyBalances } from '../components/TransferPanel/TransferPanelMain/useNativeCurrencyBalances'
import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC
} from '../util/TokenUtils'
import { getTransferMode } from '../util/getTransferMode'

/**
 * Balance of the child chain's native currency or ERC20 token
 */
export function useBalanceOnSourceChain(
  token: ERC20BridgeToken | null
): BigNumber | null {
  const { address: walletAddress } = useAccount()
  const [
    {
      sourceChain: { id: sourceChainId },
      destinationChain: { id: destinationChainId }
    }
  ] = useNetworks()
  const transferMode = getTransferMode({
    sourceChainId,
    destinationChainId
  })

  const {
    erc20: [erc20SourceChainBalances]
  } = useBalance({ chainId: sourceChainId, walletAddress })

  const nativeCurrencyBalances = useNativeCurrencyBalances()

  // user selected source chain native currency or
  // user bridging the destination chain's native currency
  if (!token) {
    return nativeCurrencyBalances.sourceBalance
  }

  const tokenAddressLowercased = token.address.toLowerCase()

  if (!erc20SourceChainBalances) {
    return constants.Zero
  }

  if (transferMode === 'deposit' || transferMode === 'teleport') {
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
