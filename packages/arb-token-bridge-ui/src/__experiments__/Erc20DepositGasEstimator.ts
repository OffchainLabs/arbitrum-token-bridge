import { AssetType } from '../hooks/arbTokenBridge.types'
import { depositTokenEstimateGas } from '../util/TokenDepositUtils'
import { GasEstimator, GasEstimatorProps } from './GasEstimator'

export class Erc20DepositGasEstimator extends GasEstimator {
  constructor(props: GasEstimatorProps) {
    super(props)
  }

  public async getGasEstimates() {
    const result = await depositTokenEstimateGas({
      l1Provider: this.sourceChainProvider,
      l2Provider: this.destinationChainProvider
    })

    return {
      sourceChain: {
        gasAmount: result.estimatedL1Gas,
        gasAssetType: AssetType.ETH
      },
      destinationChain: {
        gasAmount: result.estimatedL2Gas.add(result.estimatedL2SubmissionCost),
        gasAssetType: AssetType.ETH
      }
    }
  }
}
