import { Provider } from '@ethersproject/providers'
import { BigNumber, ContractTransaction, Signer } from 'ethers'
import { MergedTransaction } from '../state/app/state'
import { GasEstimates } from '../hooks/arbTokenBridge.types'
import { Address } from '../util/AddressUtils'
import { BridgeTransfer, TransferType } from './BridgeTransfer'

export type MergedTransactionCctp = MergedTransaction & {
  messageBytes: Address | null
  attestationHash: Address | null
}

export type BridgeTransferStarterProps = {
  sourceChainProvider: Provider
  sourceChainErc20Address?: string
  destinationChainProvider: Provider
}

export type TransferEstimateGas = {
  amount: BigNumber
  signer: Signer
}

export type TransferProps = {
  amount: BigNumber
  signer: Signer
  destinationAddress?: string
}

export type RequiresNativeCurrencyApprovalProps = {
  amount: BigNumber
  signer: Signer
}

export type ApproveNativeCurrencyProps = {
  signer: Signer
}

export type RequiresTokenApprovalProps = {
  amount: BigNumber
  signer: Signer
  destinationAddress?: string
}

export type ApproveTokenProps = {
  signer: Signer
  amount?: BigNumber
}

export abstract class BridgeTransferStarter {
  public sourceChainProvider: Provider
  public destinationChainProvider: Provider
  public sourceChainErc20Address?: string

  abstract transferType: TransferType

  constructor(props: BridgeTransferStarterProps) {
    this.sourceChainProvider = props.sourceChainProvider
    this.destinationChainProvider = props.destinationChainProvider
    this.sourceChainErc20Address = props.sourceChainErc20Address
  }

  public abstract requiresNativeCurrencyApproval(
    props: RequiresNativeCurrencyApprovalProps
  ): Promise<boolean>

  public abstract approveNativeCurrency(
    props: ApproveNativeCurrencyProps
  ): Promise<void>

  public abstract requiresTokenApproval(
    props: RequiresTokenApprovalProps
  ): Promise<boolean>

  public abstract approveTokenEstimateGas(
    props: ApproveTokenProps
  ): Promise<BigNumber | void>

  public abstract approveToken(
    props: ApproveTokenProps
  ): Promise<ContractTransaction | void>

  public abstract transferEstimateGas(
    props: TransferEstimateGas
  ): Promise<GasEstimates>

  public abstract transfer(props: TransferProps): Promise<BridgeTransfer>
}
