import { Erc20Bridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber, Contract, Signer, utils } from 'ethers'

import { GasEstimates } from '../hooks/arbTokenBridge.types'
import { nodeInterfaceABI } from '../generated'
import {
  ARB_RETRYABLE_TX_ADDRESS,
  NODE_INTERFACE_ADDRESS
} from '@arbitrum/sdk/dist/lib/dataEntities/constants'
class NodeInterface__factory {
  static readonly abi = nodeInterfaceABI
  static createInterface() {
    return new utils.Interface(nodeInterfaceABI)
  }
  static connect(address: string, provider: Provider) {
    return new Contract(address, nodeInterfaceABI, provider)
  }
}

export async function withdrawTokenEstimateGas({
  amount,
  address,
  erc20L1Address,
  l1Provider,
  l2Provider,
  l2Signer
}: {
  amount: BigNumber
  address: string
  erc20L1Address: string
  l1Provider: Provider
  l2Provider: Provider
  l2Signer: Signer | undefined | null
}): Promise<GasEstimates> {
  const nInterface = NodeInterface__factory.connect(
    NODE_INTERFACE_ADDRESS,
    l2Signer?.provider ?? l2Provider
  )

  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)

  const withdrawalRequest = await erc20Bridger.getWithdrawalRequest({
    amount,
    destinationAddress: address,
    erc20l1Address: erc20L1Address,
    from: address
  })
  console.log(
    'withdrawalRequest.txRequest.data? ',
    withdrawalRequest.txRequest.data
  )

  const gasComponents = await nInterface.callStatic.gasEstimateL1Component!(
    ARB_RETRYABLE_TX_ADDRESS,
    false,
    withdrawalRequest.txRequest.data
  )

  console.log('l1 gas? ', gasComponents.gasEstimateForL1)

  // This is the gas needed to execute the withdrawal on L1; not the batch posting fee
  const estimatedL1Gas = gasComponents.gasEstimateForL1

  const estimatedL2Gas = await l2Provider.estimateGas(
    withdrawalRequest.txRequest
  )

  return { estimatedL1Gas, estimatedL2Gas }
}
