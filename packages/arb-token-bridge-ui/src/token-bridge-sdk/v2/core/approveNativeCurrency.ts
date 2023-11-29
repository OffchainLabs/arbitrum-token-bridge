import { EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { Signer } from 'ethers'

export type ApproveNativeCurrencyProps = {
  signer: Signer
  destinationChainProvider: Provider
}

export async function approveNativeCurrency({
  signer,
  destinationChainProvider
}: ApproveNativeCurrencyProps): Promise<void> {
  const ethBridger = await EthBridger.fromProvider(destinationChainProvider)

  const approveCustomFeeTokenTx = await ethBridger.approveFeeToken({
    l1Signer: signer
  })
  await approveCustomFeeTokenTx.wait()
}
