import { Erc20Bridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import {
  ARB_RETRYABLE_TX_ADDRESS,
  NODE_INTERFACE_ADDRESS
} from '@arbitrum/sdk/dist/lib/dataEntities/constants'
import { isHex } from 'viem'
import { Chain } from 'viem/chains'

import { GasEstimates } from '../hooks/arbTokenBridge.types'
import { nodeInterfaceABI } from '../generated'
import { arbPublicClient } from './viem'

export async function withdrawTokenEstimateGas({
  amount,
  address,
  erc20L1Address,
  l2Provider,
  l2Chain
}: {
  amount: BigNumber
  address: `0x${string}`
  erc20L1Address: string
  l2Provider: Provider
  l2Chain: Chain
}): Promise<GasEstimates> {
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)

  const withdrawalRequest = await erc20Bridger.getWithdrawalRequest({
    amount,
    destinationAddress: address,
    erc20l1Address: erc20L1Address,
    from: address
  })

  const withdrawalRequestCalldata = isHex(withdrawalRequest.txRequest.data)
    ? withdrawalRequest.txRequest.data
    : '0x'

  const gasComponents = await arbPublicClient(l2Chain).simulateContract({
    address: NODE_INTERFACE_ADDRESS,
    abi: nodeInterfaceABI,
    functionName: 'gasEstimateL1Component',
    args: [ARB_RETRYABLE_TX_ADDRESS, false, withdrawalRequestCalldata],
    account: address
  })

  // This is the gas needed to execute the withdrawal on L1; not the batch posting fee
  // 1st result in the array is `gasEstimateForL1` according to ABI
  const estimatedL1Gas = BigNumber.from(gasComponents.result[0])

  const estimatedL2Gas = await l2Provider.estimateGas(
    withdrawalRequest.txRequest
  )

  return { estimatedL1Gas, estimatedL2Gas }
}
