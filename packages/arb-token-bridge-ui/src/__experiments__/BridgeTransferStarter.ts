import { Provider } from '@ethersproject/providers'
import { BigNumber, ContractTransaction, Signer } from 'ethers'

import { BridgeTransfer } from './BridgeTransfer'

export type BridgeTransferStarterConstructorProps = {
  sourceChainProvider: Provider
  sourceChainErc20ContractAddress?: string
  destinationChainProvider: Provider
}

export type BridgeTransferStarterApproveFunctionProps = {
  amount?: BigNumber
  sourceChainSigner: Signer
}

export type BridgeTransferStarterStartFunctionProps = {
  amount: BigNumber
  sourceChainSigner: Signer
  destinationChainAddress?: string
}

export abstract class BridgeTransferStarter {
  protected sourceChainProvider: Provider
  protected sourceChainErc20ContractAddress?: string
  protected destinationChainProvider: Provider

  constructor(props: BridgeTransferStarterConstructorProps) {
    this.sourceChainProvider = props.sourceChainProvider
    this.sourceChainErc20ContractAddress = props.sourceChainErc20ContractAddress
    this.destinationChainProvider = props.destinationChainProvider
  }

  public abstract requiresApproval(
    props: BridgeTransferStarterStartFunctionProps
  ): Promise<boolean>

  public abstract approve(
    props: BridgeTransferStarterApproveFunctionProps
  ): Promise<ContractTransaction>

  public abstract start(
    props: BridgeTransferStarterStartFunctionProps
  ): Promise<BridgeTransfer>
}
