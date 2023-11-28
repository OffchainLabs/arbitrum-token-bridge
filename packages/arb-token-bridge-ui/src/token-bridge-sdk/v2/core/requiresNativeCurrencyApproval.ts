import { EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber, Signer } from 'ethers'
import { fetchErc20Allowance } from '../../../util/TokenUtils'
import { NativeCurrency } from '../../../hooks/useNativeCurrency'
import { getProviderFromSigner } from './getProviderFromSigner'
import { getAddressFromSigner } from './getAddressFromSigner'

export type RequiresNativeCurrencyApprovalProps = {
  amount: BigNumber
  connectedSigner: Signer
  destinationChainProvider: Provider
  nativeCurrency: NativeCurrency
}

export async function requiresNativeCurrencyApproval({
  amount,
  connectedSigner,
  destinationChainProvider,
  nativeCurrency
}: RequiresNativeCurrencyApprovalProps) {
  if (!nativeCurrency.isCustom) return false

  const sourceChainProvider = getProviderFromSigner(connectedSigner)
  const address = await getAddressFromSigner(connectedSigner)

  const ethBridger = await EthBridger.fromProvider(destinationChainProvider)
  const { l2Network } = ethBridger

  if (typeof l2Network.nativeToken === 'undefined') {
    return false
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
