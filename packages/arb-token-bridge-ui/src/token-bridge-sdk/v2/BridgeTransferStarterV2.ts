import { Provider, TransactionReceipt } from '@ethersproject/providers'
import { BigNumber, Signer } from 'ethers'
import { NativeCurrency } from '../../hooks/useNativeCurrency'
import { NewTransaction } from '../../hooks/useTransactions'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'
import { MergedTransaction } from '../../state/app/state'

export type SelectedToken = ERC20BridgeToken & {
  sourceChainErc20ContractAddress: string
  destinationChainErc20ContractAddress?: string
}

export type ExternalCallback = () => Promise<boolean | string>

export type ExternalCallbacks = {
  [key: string]: ExternalCallback
}

export type MergedTransactionCctp = MergedTransaction & {
  messageBytes: `0x${string}` | null
  attestationHash: `0x${string}` | null
}

type OldBridgeCompatibleTxObjToBeRemovedLater =
  | NewTransaction
  | MergedTransaction
  | MergedTransactionCctp

export type TransferProps = {
  externalCallbacks: ExternalCallbacks
  txLifecycle?: Partial<{
    onTxSubmit: ({
      tx,
      oldBridgeCompatibleTxObjToBeRemovedLater
    }: {
      tx: { hash: string }
      oldBridgeCompatibleTxObjToBeRemovedLater: OldBridgeCompatibleTxObjToBeRemovedLater
    }) => void
    onTxConfirm: ({
      txReceipt,
      oldBridgeCompatibleTxObjToBeRemovedLater
    }: {
      txReceipt: TransactionReceipt
      oldBridgeCompatibleTxObjToBeRemovedLater: OldBridgeCompatibleTxObjToBeRemovedLater
    }) => void
    onTxError: (error: any) => void
  }>
}

export type BridgeTransferResultTemp = {
  sourceChainTxReceipt: TransactionReceipt
}

export type BridgeTransferStarterV2Props = {
  amount: BigNumber
  isSmartContractWallet: boolean
  destinationAddress?: string
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  connectedSigner?: Signer | null
  nativeCurrency: NativeCurrency
  nativeCurrencyBalance: BigNumber | null
  selectedToken: SelectedToken | null
  selectedTokenBalance: BigNumber | null

  // functions that can be added to SDK which act as confirmation of some actions
  // externalCallbacks: ExternalCallbacks
}

type TransferReadinessResultError = {
  type: 'error'
  key: string
  message?: string
}

type TransferReadinessResultSuccess = {
  type: 'success'
}

type TransferReadinessResultAction = {
  type: 'action'
  key: string
  message?: string
}

export type TransferReadinessResult =
  | TransferReadinessResultSuccess
  | TransferReadinessResultAction
  | TransferReadinessResultError

export abstract class BridgeTransferStarterV2 {
  amount: BigNumber
  isSmartContractWallet: boolean
  destinationAddress?: string

  sourceChainProvider: Provider
  // sourceChainNetwork: Network
  // sourceChainId: number
  connectedSigner?: Signer | null

  destinationChainProvider: Provider
  // destinationChainNetwork: Network
  // destinationChainId: number

  nativeCurrency: NativeCurrency
  nativeCurrencyBalance: BigNumber | null

  selectedToken: SelectedToken | null
  selectedTokenBalance: BigNumber | null

  // externalCallbacks: ExternalCallbacks

  constructor(props: BridgeTransferStarterV2Props) {
    this.amount = props.amount
    this.isSmartContractWallet = props.isSmartContractWallet
    this.destinationAddress = props.destinationAddress
    this.sourceChainProvider = props.sourceChainProvider
    this.destinationChainProvider = props.destinationChainProvider
    this.connectedSigner = props.connectedSigner
    this.nativeCurrency = props.nativeCurrency
    this.nativeCurrencyBalance = props.nativeCurrencyBalance

    this.selectedToken = props.selectedToken
    this.selectedTokenBalance = props.selectedTokenBalance
  }

  public abstract transfer(
    props: TransferProps
  ): Promise<BridgeTransferResultTemp>
}
