import { Erc20Bridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber, constants } from 'ethers'
import * as Sentry from '@sentry/react'
import { NodeInterface__factory } from '@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory'
import { NODE_INTERFACE_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants'

import { GasEstimates } from '../hooks/arbTokenBridge.types'

/**
 * Gas estimate for withdrawal init transaction on child chain
 */
export async function withdrawTokenEstimateGas({
  amount,
  address,
  erc20L1Address,
  l2Provider
}: {
  amount: BigNumber
  address: `0x${string}`
  erc20L1Address: string
  l2Provider: Provider
}): Promise<GasEstimates> {
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)

  const estimatedL1Gas = constants.Zero

  const withdrawalRequest = await erc20Bridger.getWithdrawalRequest({
    amount,
    destinationAddress: address,
    erc20l1Address: erc20L1Address,
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
    return {
      estimatedL1Gas,
      estimatedL2Gas: BigNumber.from(650_000)
    }
  }
}
