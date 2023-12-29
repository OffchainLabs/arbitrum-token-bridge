import { EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { ApproveNativeCurrencyProps } from '../BridgeTransferStarter'

export async function approveNativeCurrency({
  signer,
  destinationChainProvider
}: ApproveNativeCurrencyProps & {
  destinationChainProvider: Provider
}): Promise<void> {
  const ethBridger = await EthBridger.fromProvider(destinationChainProvider)

  const approveCustomFeeTokenTx = await ethBridger.approveFeeToken({
    l1Signer: signer
  })
  await approveCustomFeeTokenTx.wait()
}
