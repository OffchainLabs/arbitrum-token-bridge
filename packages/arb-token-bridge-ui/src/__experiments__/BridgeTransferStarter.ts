import { Provider } from '@ethersproject/providers'
import { BigNumber, Signer, ContractTransaction } from 'ethers'

export type BridgeTransferStarterConstructorProps = {
  fromChainProvider: Provider
  fromChainErc20ContractAddress?: string
  toChainProvider: Provider
}

export type BridgeTransferStarterStartProps = {
  fromChainSigner: Signer
  amount: BigNumber
  destinationAddress?: string
}

export type BridgeTransferStarterStartResult = Promise<ContractTransaction>

export abstract class BridgeTransferStarter {
  protected fromChainProvider: Provider
  protected fromChainErc20ContractAddress?: string
  protected toChainProvider: Provider

  constructor(props: BridgeTransferStarterConstructorProps) {
    this.fromChainProvider = props.fromChainProvider
    this.fromChainErc20ContractAddress = props.fromChainErc20ContractAddress
    this.toChainProvider = props.toChainProvider
  }

  public abstract start(
    props: BridgeTransferStarterStartProps
  ): BridgeTransferStarterStartResult
}
