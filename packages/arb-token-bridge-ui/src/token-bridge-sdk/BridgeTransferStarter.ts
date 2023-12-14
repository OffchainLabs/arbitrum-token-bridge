import { Provider } from '@ethersproject/providers'
import { BigNumber, ContractTransaction, Signer } from 'ethers'
import { ERC20BridgeToken } from '../hooks/arbTokenBridge.types'
import { MergedTransaction } from '../state/app/state'

type Asset = 'erc20' | 'eth'
type TxType = 'deposit' | 'withdrawal'
type Chain = 'source_chain' | 'destination_chain'
type TxStatus = 'pending' | 'success' | 'error'

export type BridgeTransferStatus = `${Chain}_tx_${TxStatus}`
export type TransferType = `${Asset}_${TxType}` | 'cctp'

export type SelectedToken = ERC20BridgeToken

export type MergedTransactionCctp = MergedTransaction & {
  messageBytes: `0x${string}` | null
  attestationHash: `0x${string}` | null
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
  destinationChainProvider: Provider
  selectedToken?: SelectedToken
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
  address: string
  destinationAddress?: string
}

export type ApproveTokenProps = {
  signer: Signer
}

export type ApproveTokenEstimateGasProps = {
  amount: BigNumber
  signer: Signer
}

export abstract class BridgeTransferStarter {
  public sourceChainProvider: Provider
  public destinationChainProvider: Provider
  public selectedToken?: SelectedToken

  abstract transferType: TransferType

  constructor(props: BridgeTransferStarterProps) {
    this.sourceChainProvider = props.sourceChainProvider
    this.destinationChainProvider = props.destinationChainProvider
    this.selectedToken = props.selectedToken ?? undefined // if token not provided, fallback to eth, or let the child class define it's token (eg. CCTP)
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
    props: ApproveTokenEstimateGasProps
  ): Promise<BigNumber>

  public abstract approveToken(
    props: ApproveTokenProps
  ): Promise<ContractTransaction>

  public abstract transfer(props: TransferProps): Promise<BridgeTransfer>
}
