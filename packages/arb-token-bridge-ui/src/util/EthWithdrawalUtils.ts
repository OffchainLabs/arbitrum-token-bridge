import { EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import * as Sentry from '@sentry/react'
import { NodeInterface__factory } from '@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory'
import { NODE_INTERFACE_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants'

import { GasEstimates } from '../hooks/arbTokenBridge.types'

export async function withdrawEthEstimateGas({
  amount,
  address,
  l2Provider
}: {
  amount: BigNumber
  address: `0x${string}`
  l2Provider: Provider
}): Promise<GasEstimates> {
  const ethBridger = await EthBridger.fromProvider(l2Provider)

  const withdrawalRequest = await ethBridger.getWithdrawalRequest({
    amount,
    destinationAddress: address,
    from: address
  })

  const nodeInterface = NodeInterface__factory.connect(
    NODE_INTERFACE_ADDRESS,
    l2Provider
  )

  try {
    const gasComponents = await nodeInterface.callStatic.gasEstimateComponents(
      address,
      false,
      withdrawalRequest.txRequest.data
    )
    // This is the gas needed to pay for the batch posting fee
    const estimatedL1Gas = BigNumber.from(gasComponents.gasEstimateForL1)

    // add 30% to the estimated total gas as buffer
    const estimatedTotalGas = BigNumber.from(
      Math.ceil(Number(gasComponents.gasEstimate) * 1.3)
    )

    const estimatedL2Gas = estimatedTotalGas.sub(estimatedL1Gas)

    return { estimatedL1Gas, estimatedL2Gas }
  } catch (error) {
    Sentry.captureException(error)
    const estimatedL1Gas = BigNumber.from(130_000)
    // figures based on gas estimation returned
    const estimatedTotalGas = await l2Provider.estimateGas(
      withdrawalRequest.txRequest
    )

    return {
      estimatedL1Gas,
      estimatedL2Gas: estimatedTotalGas.sub(estimatedL1Gas)
    }
  }
}
