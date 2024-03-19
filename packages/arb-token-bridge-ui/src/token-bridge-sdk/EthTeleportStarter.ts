import { EthL1L3Bridger, getL2Network } from '@arbitrum/sdk'
import {
  ApproveNativeCurrencyProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresNativeCurrencyApprovalProps,
  TransferEstimateGas,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { getL2ConfigForTeleport } from './teleport'

export class EthTeleportStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'eth_teleport'

  constructor(props: BridgeTransferStarterProps) {
    super(props)
  }

  public async requiresNativeCurrencyApproval({
    amount,
    signer
  }: RequiresNativeCurrencyApprovalProps) {
    return false
  }

  public async approveNativeCurrency({
    signer,
    amount
  }: ApproveNativeCurrencyProps) {
    // const ethBridger = await EthBridger.fromProvider(
    //   this.destinationChainProvider
    // )
    // return ethBridger.approveGasToken({
    //   l1Signer: signer,
    //   amount
    // })
  }

  public requiresTokenApproval = async () => false

  public approveTokenEstimateGas = async () => {
    // no-op
  }

  public approveToken = async () => {
    // no-op
  }

  public async transferEstimateGas({ amount, signer }: TransferEstimateGas) {
    return undefined
  }

  public async transfer({ amount, signer }: TransferProps) {
    const l3Network = await getL2Network(this.destinationChainProvider)

    // get the intermediate L2 chain provider
    const { l2Provider } = await getL2ConfigForTeleport({
      destinationChainProvider: this.destinationChainProvider
    })

    const l1l3Bridger = new EthL1L3Bridger(l3Network)

    const depositRequest = await l1l3Bridger.getDepositRequest({
      l1Signer: signer,
      amount: amount,
      l2Provider,
      l3Provider: this.destinationChainProvider
    })

    const tx = await l1l3Bridger.deposit({
      ...depositRequest,
      l1Signer: signer
    })

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: { ...tx },
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
