import { Provider } from '@ethersproject/providers'
import { MaxUint256 } from '@ethersproject/constants'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { Erc20Bridger } from '@arbitrum/sdk'
import { ERC20BridgeToken } from '../hooks/arbTokenBridge.types'
import { MergedTransaction } from '../state/app/state'
import { BigNumber, Signer } from 'ethers'

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

export type TransferProps = {
  amount: BigNumber
  destinationChainProvider: Provider
  signer: Signer
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

export type BridgeTransferStarterProps = {
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  selectedToken: SelectedToken | null
}

export type RequiresNativeCurrencyApprovalProps = {
  amount: BigNumber
  signer: Signer
  destinationChainProvider: Provider
}

export type ApproveNativeCurrencyProps = {
  signer: Signer
  destinationChainProvider: Provider
}

export type RequiresTokenApprovalProps = {
  amount: BigNumber
  address: string
  selectedToken: SelectedToken
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  destinationAddress?: string
}

export type ApproveTokenProps = {
  signer: Signer
  selectedToken: SelectedToken
  destinationChainProvider: Provider
}

export type ApproveTokenGasEstimationProps = {
  erc20L1Address: string
  address: string
  l1Provider: Provider
  l2Provider: Provider
}

export abstract class BridgeTransferStarter {
  public sourceChainProvider: Provider
  public destinationChainProvider: Provider
  public selectedToken: SelectedToken | null

  abstract transferType: TransferType

  constructor(props: BridgeTransferStarterProps) {
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

  public static async approveTokenGasEstimation({
    erc20L1Address,
    address,
    l1Provider,
    l2Provider
  }: ApproveTokenGasEstimationProps) {
    const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
    const l1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
      erc20L1Address,
      l1Provider
    )

    const contract = ERC20__factory.connect(erc20L1Address, l1Provider)

    return contract.estimateGas.approve(l1GatewayAddress, MaxUint256, {
      from: address
    })
  }

  public abstract approveToken(props: ApproveTokenProps): Promise<void>

  public abstract transfer(props: TransferProps): Promise<BridgeTransfer>
}
