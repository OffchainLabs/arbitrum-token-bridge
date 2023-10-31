import { EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber, constants } from 'ethers'
import { DepositGasEstimates } from '../hooks/arbTokenBridge.types'

export async function depositEthEstimateGas({
  amount,
  address,
  l1Provider,
  l2Provider
}: {
  amount: BigNumber
  address: string
  l1Provider: Provider
  l2Provider: Provider
}): Promise<DepositGasEstimates> {
  const ethBridger = await EthBridger.fromProvider(l2Provider)

  const depositRequest = await ethBridger.getDepositRequest({
    amount,
    from: address
  })

  const estimatedL1Gas = await l1Provider.estimateGas(depositRequest.txRequest)

  return {
    estimatedL1Gas,
    estimatedL2Gas: constants.Zero,
    estimatedL2SubmissionCost: constants.Zero
  }
}
