import { EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'

import { GasEstimates } from '../hooks/arbTokenBridge.types'

export async function withdrawEthEstimateGas({
  amount,
  address,
  l2Provider
}: {
  amount: BigNumber
  address: string
  l2Provider: Provider
}): Promise<GasEstimates> {
  const ethBridger = await EthBridger.fromProvider(l2Provider)

  const withdrawalRequest = await ethBridger.getWithdrawalRequest({
    amount,
    destinationAddress: address,
    from: address
  })

  const estimatedL2Gas = await l2Provider.estimateGas(
    withdrawalRequest.txRequest
  )

  return {
    estimatedL1Gas: BigNumber.from(0),
    estimatedL2Gas
  }
}
