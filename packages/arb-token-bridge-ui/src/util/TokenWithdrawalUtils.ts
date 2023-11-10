import { Erc20Bridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import * as Sentry from '@sentry/react'
import { NODE_INTERFACE_ADDRESS } from '@arbitrum/sdk/dist/lib/dataEntities/constants'
import { PublicClient, isHex } from 'viem'

import { GasEstimates } from '../hooks/arbTokenBridge.types'
import { nodeInterfaceABI } from '../generated'

export async function withdrawTokenEstimateGas({
  amount,
  address,
  erc20L1Address,
  l2Provider,
  arbPublicClient
}: {
  amount: BigNumber
  address: `0x${string}`
  erc20L1Address: string
  l2Provider: Provider
  arbPublicClient: PublicClient
}): Promise<GasEstimates> {
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)

  const withdrawalRequest = await erc20Bridger.getWithdrawalRequest({
    amount,
    destinationAddress: address,
    erc20l1Address: erc20L1Address,
    from: address
  })

  // if it falls into the `0x` case, user shouldn't be able to perform the tx
  // so it doesn't matter if the estimate is lower than the actual gas
  const withdrawalRequestCalldata = isHex(withdrawalRequest.txRequest.data)
    ? withdrawalRequest.txRequest.data
    : '0x'

  try {
    const gasComponents = await arbPublicClient.simulateContract({
      address: NODE_INTERFACE_ADDRESS,
      abi: nodeInterfaceABI,
      functionName: 'gasEstimateComponents',
      args: [address, false, withdrawalRequestCalldata],
      account: address
    })

    // This is the gas needed to pay for the batch posting fee
    // 1st result in the array is `gasEstimateForL1` according to ABI
    const estimatedL1Gas = BigNumber.from(gasComponents.result[1])

    // add 30% to the estimated total gas as buffer
    const estimatedTotalGas = BigNumber.from(
      Math.ceil(Number(gasComponents.result[0]) * 1.3)
    )

    const estimatedL2Gas = estimatedTotalGas.sub(estimatedL1Gas)

    return { estimatedL1Gas, estimatedL2Gas }
  } catch (error) {
    Sentry.captureException(error)
    // figures based on gas estimation returned
    return {
      estimatedL1Gas: BigNumber.from(498_000),
      estimatedL2Gas: BigNumber.from(150_000)
    }
  }
}
