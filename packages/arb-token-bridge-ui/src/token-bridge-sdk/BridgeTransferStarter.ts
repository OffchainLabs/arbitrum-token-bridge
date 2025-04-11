import { Provider } from '@ethersproject/providers'
import { BigNumber, ContractTransaction, Signer } from 'ethers'
import { MergedTransaction } from '../state/app/state'
import {
  GasEstimates,
  DepositGasEstimates
} from '../hooks/arbTokenBridge.types'
import { Address } from '../util/AddressUtils'
import { getChainIdFromProvider } from './utils'

type Asset = 'erc20' | 'eth'
type TxType = 'deposit' | 'withdrawal' | 'teleport'
type Chain = 'source_chain' | 'destination_chain'
type TxStatus = 'pending' | 'success' | 'error'

export type BridgeTransferStatus = `${Chain}_tx_${TxStatus}`
export type TransferType = `${Asset}_${TxType}` | 'cctp' | 'oftV2'

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
  destinationChainErc20Address?: string
}

export type BridgeTransferStarterPropsWithChainIds = {
  sourceChainId: number
  sourceChainErc20Address?: string
  destinationChainId: number
  destinationChainErc20Address?: string
}

export type TransferEstimateGasProps = {
  amount: BigNumber
  signer: Signer
  destinationAddress?: string
}

export type TransferOverrides = {
  maxSubmissionCost?: BigNumber
  excessFeeRefundAddress?: string
}

export type TransferProps = {
  amount: BigNumber
  signer: Signer
  destinationAddress?: string
  overrides?: TransferOverrides
}

export type TransferEstimateGasResult =
  | GasEstimates
  | DepositGasEstimates
  | undefined

export type RequiresNativeCurrencyApprovalProps = {
  amount: BigNumber
  signer: Signer
  destinationAddress?: string
  options?: {
    approvalAmountIncrease?: BigNumber
  }
}

export type ApproveNativeCurrencyEstimateGasProps = {
  signer: Signer
  amount?: BigNumber
}

export type ApproveNativeCurrencyProps = {
  signer: Signer
  amount: BigNumber
  destinationAddress?: string
  options?: {
    approvalAmountIncrease?: BigNumber
  }
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
  public destinationChainErc20Address?: string

  protected sourceChainId?: number

  abstract transferType: TransferType

  constructor(props: BridgeTransferStarterProps) {
    this.sourceChainProvider = props.sourceChainProvider
    this.destinationChainProvider = props.destinationChainProvider
    this.sourceChainErc20Address = props.sourceChainErc20Address
    this.destinationChainErc20Address = props.destinationChainErc20Address
  }

  protected async getSourceChainId(): Promise<number> {
    if (typeof this.sourceChainId === 'undefined') {
      this.sourceChainId = await getChainIdFromProvider(
        this.sourceChainProvider
      )
    }

    return this.sourceChainId
  }

  public abstract requiresNativeCurrencyApproval(
    props: RequiresNativeCurrencyApprovalProps
  ): Promise<boolean>

  public abstract approveNativeCurrencyEstimateGas(
    props: ApproveNativeCurrencyEstimateGasProps
  ): Promise<BigNumber | void>

  public abstract approveNativeCurrency(
    props: ApproveNativeCurrencyProps
  ): Promise<ContractTransaction | void>

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
    props: TransferEstimateGasProps
  ): Promise<TransferEstimateGasResult>

  public abstract transfer(props: TransferProps): Promise<BridgeTransfer>
}
