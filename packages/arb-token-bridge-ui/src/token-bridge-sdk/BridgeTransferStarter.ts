import { Provider, TransactionRequest } from '@ethersproject/providers'
import { BigNumber, ContractTransaction, Signer } from 'ethers'
import { Config } from 'wagmi'
import { SimulateContractReturnType } from '@wagmi/core'

import { MergedTransaction } from '../state/app/state'
import {
  GasEstimates,
  DepositGasEstimates
} from '../hooks/arbTokenBridge.types'
import { Address } from '../util/AddressUtils'
import { getChainIdFromProvider } from './utils'
import { LifiData } from './LifiTransferStarter'

type Asset = 'erc20' | 'eth'
type TxType = 'deposit' | 'withdrawal' | 'teleport'
type Chain = 'source_chain' | 'destination_chain'
type TxStatus = 'pending' | 'success' | 'error'

export type BridgeTransferStatus = `${Chain}_tx_${TxStatus}`
export type TransferType = `${Asset}_${TxType}` | 'cctp' | 'oftV2' | 'lifi'

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
  lifiData?: LifiData
}

export type TransferEstimateGasProps = {
  amount: BigNumber
  from: string
  destinationAddress?: string
  wagmiConfig?: Config
}

export type TransferOverrides = {
  maxSubmissionCost?: BigNumber
  excessFeeRefundAddress?: string
}

export type TransferPrepareTxRequestProps = {
  amount: BigNumber
  from: string
  destinationAddress?: string
  overrides?: TransferOverrides
  wagmiConfig?: Config
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
  owner: string
  destinationAddress?: string
}

export type ApproveTokenPrepareTxRequestProps = {
  amount?: BigNumber
}

export type ApproveTokenProps = {
  signer: Signer
  amount?: BigNumber
}

export abstract class BridgeTransferStarter {
  private sourceChainId?: number

  public sourceChainProvider: Provider
  public destinationChainProvider: Provider
  public sourceChainErc20Address?: string
  public destinationChainErc20Address?: string

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

  // not marking this as abstract for now, as we need a dummy implementation for every class
  // only cctp is going to override it for now, and we'll do the same for others one by one
  // finally, once we have all implementations we'll mark it as abstract
  public async approveTokenPrepareTxRequest(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    props?: ApproveTokenPrepareTxRequestProps
  ): Promise<TransactionRequest> {
    return {} as TransactionRequest
  }

  public abstract approveTokenEstimateGas(
    props: ApproveTokenProps
  ): Promise<BigNumber | void>

  public abstract approveToken(
    props: ApproveTokenProps
  ): Promise<ContractTransaction | void>

  // not marking this as abstract for now, as we need a dummy implementation for every class
  // only cctp is going to override it for now, and we'll do the same for others one by one
  // finally, once we have all implementations we'll mark it as abstract
  public async transferPrepareTxRequest(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    props?: TransferPrepareTxRequestProps
  ): Promise<TransactionRequest | SimulateContractReturnType> {
    return {} as TransactionRequest | SimulateContractReturnType
  }

  public abstract transferEstimateGas(
    props: TransferEstimateGasProps
  ): Promise<TransferEstimateGasResult>

  public abstract transfer(props: TransferProps): Promise<BridgeTransfer>
}
