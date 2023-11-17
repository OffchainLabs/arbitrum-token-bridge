import { BigNumber, Signer } from 'ethers'
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

  sourceChainSigner: Signer

  amount: BigNumber
  // account: string
}

export abstract class GasEstimator {
  public sourceChainProvider: Provider
  public destinationChainProvider: Provider
  public sourceChainErc20ContractAddress
  public destinationChainErc20ContractAddress
  public amount: BigNumber
  public sourceChainSigner: Signer

  constructor(props: GasEstimatorProps) {
    this.sourceChainProvider = props.sourceChainProvider
    this.destinationChainProvider = props.destinationChainProvider
    this.sourceChainErc20ContractAddress = props.sourceChainErc20ContractAddress
    this.destinationChainErc20ContractAddress =
      props.destinationChainErc20ContractAddress
    this.amount = props.amount
    this.sourceChainSigner = props.sourceChainSigner
  }

  public abstract getGasEstimates(): Promise<GasEstimates>
}
