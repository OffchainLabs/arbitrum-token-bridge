import { EthBridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { GasEstimates } from '../hooks/arbTokenBridge.types'

export async function withdrawEthEstimateGas({
  amount,
  walletAddress,
  l2Provider
}: {
  amount: BigNumber
  walletAddress: string
  l2Provider: Provider
}): Promise<GasEstimates> {
  const ethBridger = await EthBridger.fromProvider(l2Provider)

  const withdrawalRequest = await ethBridger.getWithdrawalRequest({
    amount,
    destinationAddress: walletAddress,
    from: walletAddress
  })

  // Can't do this atm. Hardcoded to 130_000.
  const estimatedL1Gas = BigNumber.from(130_000)

  const estimatedL2Gas = await l2Provider.estimateGas(
    withdrawalRequest.txRequest
  )

  return { estimatedL1Gas, estimatedL2Gas }
}
