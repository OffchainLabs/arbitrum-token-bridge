import { Signer } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { EthBridger } from '@arbitrum/sdk'

export async function approveCustomFeeTokenForInboxEstimateGas(params: {
  chainProvider: Provider
  parentChainSigner: Signer
}) {
  const { chainProvider, parentChainSigner } = params
  const ethBridger = await EthBridger.fromProvider(chainProvider)

  const approveFeeTokenTxRequest = ethBridger.getApproveFeeTokenTxRequest()

  return parentChainSigner.estimateGas(approveFeeTokenTxRequest)
}
