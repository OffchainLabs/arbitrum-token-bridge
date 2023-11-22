import { EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { fetchErc20Allowance } from '../../../util/TokenUtils'
import { NativeCurrency } from '../../../hooks/useNativeCurrency'

export type RequiresNativeCurrencyApprovalProps = {
  address: string
  amount: BigNumber
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  nativeCurrency: NativeCurrency
}

export async function requiresNativeCurrencyApproval({
  address,
  amount,
  sourceChainProvider,
  destinationChainProvider,
  nativeCurrency
}: RequiresNativeCurrencyApprovalProps) {
  if (!nativeCurrency.isCustom) return false

  const ethBridger = await EthBridger.fromProvider(destinationChainProvider)
  const { l2Network } = ethBridger

  if (typeof l2Network.nativeToken === 'undefined') {
    throw new Error('l2 network does not use custom fee token')
  }

  const customFeeTokenAllowanceForInbox = await fetchErc20Allowance({
    address: l2Network.nativeToken,
    provider: sourceChainProvider,
    owner: address,
    spender: l2Network.ethBridge.inbox
  })

  // We want to bridge a certain amount of the custom fee token, so we have to check if the allowance is enough.
  if (!customFeeTokenAllowanceForInbox.gte(amount)) {
    return true
  }

  return false
}
