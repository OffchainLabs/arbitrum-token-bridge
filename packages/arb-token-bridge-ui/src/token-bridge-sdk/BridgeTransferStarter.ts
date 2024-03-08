import { Provider } from '@ethersproject/providers'
import { BigNumber, ContractTransaction, Signer } from 'ethers'
import { MergedTransaction } from '../state/app/state'
import { Address } from '../util/AddressUtils'

type Asset = 'erc20' | 'eth'
type TxType = 'deposit' | 'withdrawal'
type Chain = 'source_chain' | 'destination_chain'
type TxStatus = 'pending' | 'success' | 'error'

export type BridgeTransferStatus = `${Chain}_tx_${TxStatus}`
export type TransferType = `${Asset}_${TxType}` | 'cctp'

export type MergedTransactionCctp = MergedTransaction & {
  messageBytes: Address | null
  attestationHash: Address | null
}

export type BridgeTransfer = {
  transferType: TransferType
  status: string
  sourceChainProvider: Provider
  sourceChainTransaction: { hash: string }
  destinationChainProvider: Provider
  destinationChainTransaction?: { hash: string }
}

export type BridgeTransferStarterProps = {
  sourceChainProvider: Provider
  sourceChainErc20Address?: string
  destinationChainProvider: Provider
}

export type TransferProps = {
  amount: BigNumber
  signer: Signer
  isSmartContractWallet?: boolean
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
  ): Promise<BigNumber>

  public abstract approveToken(
    props: ApproveTokenProps
  ): Promise<ContractTransaction>

  public abstract transfer(props: TransferProps): Promise<BridgeTransfer>
}
