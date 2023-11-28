import { Provider } from '@ethersproject/providers'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { MergedTransaction } from '../../state/app/state'
import { RequiresNativeCurrencyApprovalProps } from './core/requiresNativeCurrencyApproval'
import { ApproveNativeCurrencyProps } from './core/approveNativeCurrency'
import { RequiresTokenApprovalProps } from './core/requiresTokenApproval'
import { ApproveTokenProps } from './core/approveToken'
import { BigNumber, Signer } from 'ethers'

type Asset = 'erc20' | 'eth' | 'usdc'
type TxType = 'deposit' | 'withdrawal'
type Chain = 'source_chain' | 'destination_chain'
type TxStatus = 'pending' | 'success' | 'error'

export type BridgeTransferStatus = `${Chain}_tx_${TxStatus}`
export type TransferType = `${Asset}_${TxType}`

export type SelectedToken = ERC20BridgeToken

export type MergedTransactionCctp = MergedTransaction & {
  messageBytes: `0x${string}` | null
  attestationHash: `0x${string}` | null
}

export type TransferProps = {
  amount: BigNumber
  destinationChainProvider: Provider
  connectedSigner: Signer
  isSmartContractWallet?: boolean
  destinationAddress?: string
  selectedToken?: SelectedToken | null
}

export type BridgeTransfer = {
  transferType: TransferType
  status: string
  sourceChainProvider: Provider
  sourceChainTransaction: { hash: string }
  destinationChainProvider: Provider
  destinationChainTransaction?: { hash: string }
}

export type BridgeTransferStarterV2Props = {
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  selectedToken: SelectedToken | null
}

export abstract class BridgeTransferStarterV2 {
  public sourceChainProvider: Provider
  public destinationChainProvider: Provider
  public selectedToken: SelectedToken | null

  abstract transferType: TransferType

  constructor(props: BridgeTransferStarterV2Props) {
    this.sourceChainProvider = props.sourceChainProvider
    this.destinationChainProvider = props.destinationChainProvider
    this.selectedToken = props.selectedToken
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

  public abstract approveToken(props: ApproveTokenProps): Promise<void>

  public abstract transfer(props: TransferProps): Promise<BridgeTransfer>

  // public abstract transferConfirm(props: BridgeTransfer): Promise<void>
}
