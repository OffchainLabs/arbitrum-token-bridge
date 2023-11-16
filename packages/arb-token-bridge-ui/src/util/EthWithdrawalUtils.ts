import { EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber, constants } from 'ethers'
import * as Sentry from '@sentry/react'
import { NodeInterface__factory } from '@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory'
import { NODE_INTERFACE_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants'

import { GasEstimates } from '../hooks/arbTokenBridge.types'

/**
 * Gas estimate for withdrawal init transaction on child chain
 */
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

  const estimatedL1Gas = constants.Zero

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

    // add 30% to the estimated total gas as buffer
    const estimatedL2Gas = BigNumber.from(
      Math.ceil(Number(gasComponents.gasEstimate) * 1.3)
    )

    return { estimatedL1Gas, estimatedL2Gas }
  } catch (error) {
    Sentry.captureException(error)

    // figures based on gas estimation returned
    const estimatedL2Gas = await l2Provider
      .estimateGas(withdrawalRequest.txRequest)
      .catch(error => {
        Sentry.captureException(error)
        // from recent gas estimation
        return BigNumber.from(4_300_000)
      })

    return {
      estimatedL1Gas,
      estimatedL2Gas
    }
  }
}
