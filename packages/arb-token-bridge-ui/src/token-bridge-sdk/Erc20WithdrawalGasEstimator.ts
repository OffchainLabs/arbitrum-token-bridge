import { AssetType } from '../hooks/arbTokenBridge.types'
import { withdrawTokenEstimateGas } from '../util/TokenWithdrawalUtils'
import { GasEstimator, GasEstimatorProps } from './GasEstimator'

type Erc20WithdrawalGasEstimatorProps = Required<GasEstimatorProps>

export class Erc20WithdrawalGasEstimator extends GasEstimator {
  constructor(props: Erc20WithdrawalGasEstimatorProps) {
    super(props)
  }

  public async getGasEstimates() {
    const result = await withdrawTokenEstimateGas({
      amount: this.amount,
      erc20L1Address: this.destinationChainErc20ContractAddress!,
      address: '0x2cd28Cda6825C4967372478E87D004637B73F996', // hardcode account since it will just simulate txn
      l2Provider: this.sourceChainProvider
    })

    return {
      sourceChain: {
        gasAmount: result.estimatedL1Gas,
        gasAssetType: AssetType.ETH
      },
      destinationChain: {
        gasAmount: result.estimatedL1Gas,
        gasAssetType: AssetType.ETH
      }
    }
  }
}
