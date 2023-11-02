import { BigNumber } from 'ethers'
import { AssetType } from '../hooks/arbTokenBridge.types'
import { Provider } from '@ethersproject/providers'

export type GasEstimates = {
  sourceChain: {
    gasAmount: BigNumber
    gasAssetType: AssetType
    description?: string
  }
  destinationChain: {
    gasAmount: BigNumber
    gasAssetType: AssetType
    description?: string
  }
}

export type GasEstimatorProps = {
  sourceChainProvider: Provider
  destinationChainProvider: Provider

  sourceChainErc20ContractAddress?: string
  destinationChainErc20ContractAddress?: string

  amount: BigNumber
  // account: string
}

export abstract class GasEstimator {
  public sourceChainProvider: Provider
  public destinationChainProvider: Provider
  public sourceChainErc20ContractAddress?: string
  public destinationChainErc20ContractAddress?: string
  public amount: BigNumber

  constructor(props: GasEstimatorProps) {
    this.sourceChainProvider = props.sourceChainProvider
    this.destinationChainProvider = props.destinationChainProvider
    this.sourceChainErc20ContractAddress = props.sourceChainErc20ContractAddress
    this.destinationChainErc20ContractAddress =
      props.destinationChainErc20ContractAddress
    this.amount = props.amount
  }

  public abstract getGasEstimates(): Promise<GasEstimates>
}
