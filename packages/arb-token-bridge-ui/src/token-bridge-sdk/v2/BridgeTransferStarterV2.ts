import { Provider, TransactionReceipt } from '@ethersproject/providers'
import { BigNumber, ContractTransaction, Signer } from 'ethers'
import { NativeCurrency } from '../../hooks/useNativeCurrency'
import { NewTransaction } from '../../hooks/useTransactions'
import { ERC20BridgeToken } from '../../hooks/arbTokenBridge.types'

type SelectedToken = ERC20BridgeToken & {
  sourceChainErc20ContractAddress: string
  destinationChainErc20ContractAddress?: string
}

export type ConfirmationCallbacks = { [key: string]: () => Promise<boolean> }

export type TransferProps = {
  confirmationCallbacks: ConfirmationCallbacks
  txLifecycle?: Partial<{
    onTxSubmit: (
      tx: ContractTransaction,
      oldBridgeCompatibleTxObjToBeRemovedLater: NewTransaction
    ) => void
    onTxConfirm: (txReceipt: TransactionReceipt) => void
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
  sourceChainSigner?: Signer | null
  destinationChainSigner?: Signer | null
  nativeCurrency: NativeCurrency
  nativeCurrencyBalance: BigNumber | null
  selectedToken: SelectedToken | null
  selectedTokenBalance: BigNumber | null

  // functions that can be added to SDK which act as confirmation of some actions
  // confirmationCallbacks: ConfirmationCallbacks
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
  sourceChainSigner?: Signer | null

  destinationChainProvider: Provider
  // destinationChainNetwork: Network
  // destinationChainId: number
  destinationChainSigner?: Signer | null

  nativeCurrency: NativeCurrency
  nativeCurrencyBalance: BigNumber | null

  selectedToken: SelectedToken | null
  selectedTokenBalance: BigNumber | null

  // confirmationCallbacks: ConfirmationCallbacks

  constructor(props: BridgeTransferStarterV2Props) {
    this.amount = props.amount
    this.isSmartContractWallet = props.isSmartContractWallet
    this.destinationAddress = props.destinationAddress
    this.sourceChainProvider = props.sourceChainProvider
    this.destinationChainProvider = props.destinationChainProvider
    this.sourceChainSigner = props.sourceChainSigner
    this.destinationChainSigner = props.destinationChainSigner
    this.nativeCurrency = props.nativeCurrency
    this.nativeCurrencyBalance = props.nativeCurrencyBalance

    this.selectedToken = props.selectedToken
    this.selectedTokenBalance = props.selectedTokenBalance
  }

  public abstract transfer(
    props: TransferProps
  ): Promise<BridgeTransferResultTemp>
}
