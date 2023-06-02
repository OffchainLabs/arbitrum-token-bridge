import { Erc20Bridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { GasEstimates } from '../hooks/arbTokenBridge.types'

export async function withdrawTokenEstimateGas({
  amount,
  address,
  erc20L1Address,
  l2Provider
}: {
  amount: BigNumber
  address: string
  erc20L1Address: string
  l2Provider: Provider
}): Promise<GasEstimates> {
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
  const estimatedL1Gas = BigNumber.from(160_000)

  const withdrawalRequest = await erc20Bridger.getWithdrawalRequest({
    amount,
    destinationAddress: address,
    erc20l1Address: erc20L1Address,
    from: address
  })

  const estimatedL2Gas = await l2Provider.estimateGas(
    withdrawalRequest.txRequest
  )

  return { estimatedL1Gas, estimatedL2Gas }
}
