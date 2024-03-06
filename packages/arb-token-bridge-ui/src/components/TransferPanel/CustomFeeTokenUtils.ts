import { Signer } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { EthBridger, Erc20Bridger } from '@arbitrum/sdk'

export async function approveCustomFeeTokenEstimateGas(params: {
  erc20L1Address?: string
  l1Signer: Signer
  l1Provider: Provider
  l2Provider: Provider
}) {
  const { erc20L1Address } = params

  if (typeof erc20L1Address !== 'undefined') {
    return approveCustomFeeTokenForGatewayEstimateGas({
      ...params,
      erc20L1Address
    })
  }

  return approveCustomFeeTokenForInboxEstimateGas(params)
}

export async function approveCustomFeeTokenForInboxEstimateGas(params: {
  l1Signer: Signer
  l2Provider: Provider
}) {
  const { l1Signer, l2Provider } = params
  const ethBridger = await EthBridger.fromProvider(l2Provider)

  const txRequest = ethBridger.getApproveGasTokenRequest()

  return l1Signer.estimateGas(txRequest)
}

export async function approveCustomFeeTokenForGatewayEstimateGas(params: {
  erc20L1Address: string
  l1Signer: Signer
  l1Provider: Provider
  l2Provider: Provider
}) {
  const { erc20L1Address, l1Signer, l1Provider, l2Provider } = params
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)

  const txRequest = await erc20Bridger.getApproveGasTokenRequest({
    erc20L1Address,
    l1Provider
  })

  return l1Signer.estimateGas(txRequest)
}
