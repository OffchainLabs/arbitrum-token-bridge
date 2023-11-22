import { EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { Signer } from 'ethers'

export type ApproveNativeCurrencyProps = {
  connectedSigner: Signer
  destinationChainProvider: Provider
}

export async function approveNativeCurrency({
  connectedSigner,
  destinationChainProvider
}: ApproveNativeCurrencyProps): Promise<void> {
  const ethBridger = await EthBridger.fromProvider(destinationChainProvider)

  const approveCustomFeeTokenTx = await ethBridger.approveFeeToken({
    l1Signer: connectedSigner
  })
  await approveCustomFeeTokenTx.wait()
}
