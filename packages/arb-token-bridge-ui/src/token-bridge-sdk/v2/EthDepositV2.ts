import { EthBridger } from '@arbitrum/sdk'
import {
  BridgeTransferStarterV2,
  BridgeTransferStarterV2Props,
  TransferProps,
  TransferType
} from './BridgeTransferStarterV2'
import { requiresNativeCurrencyApproval } from './core/requiresNativeCurrencyApproval'
import { approveNativeCurrency } from './core/approveNativeCurrency'

export class EthDepositStarterV2 extends BridgeTransferStarterV2 {
  public transferType: TransferType = 'eth_deposit'

  constructor(props: BridgeTransferStarterV2Props) {
    super(props)
  }

  public requiresNativeCurrencyApproval = requiresNativeCurrencyApproval

  public approveNativeCurrency = approveNativeCurrency

  public requiresTokenApproval = async () => false

  public approveToken = async () => {
    return
  }

  public async transfer({ amount, signer }: TransferProps) {
    const ethBridger = await EthBridger.fromProvider(
      this.destinationChainProvider
    )
    const tx = await ethBridger.deposit({
      amount,
      l1Signer: signer
    })

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: tx,
      destinationChainProvider: this.destinationChainProvider
    }

    //   const txReceipt = await tx.wait()

    //   if (txLifecycle?.onTxConfirm) {
    //     txLifecycle.onTxConfirm({
    //       txReceipt,
    //       oldBridgeCompatibleTxObjToBeRemovedLater
    //     })
    //   }

    //   return {
    //     sourceChainTxReceipt: txReceipt
    //   }
  }
}
