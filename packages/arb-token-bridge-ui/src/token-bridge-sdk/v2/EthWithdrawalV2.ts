import { EthBridger } from '@arbitrum/sdk'
import {
  BridgeTransferStarterV2,
  BridgeTransferStarterV2Props,
  TransferProps,
  TransferType
} from './BridgeTransferStarterV2'
import { getProviderFromSigner } from './core/getProviderFromSigner'
import { requiresNativeCurrencyApproval } from './core/requiresNativeCurrencyApproval'
import { approveNativeCurrency } from './core/approveNativeCurrency'
import { getAddressFromSigner } from './core/getAddressFromSigner'

export class EthWithdrawalStarterV2 extends BridgeTransferStarterV2 {
  public transferType: TransferType = 'eth_withdrawal'

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
    const address = await getAddressFromSigner(signer)

    const ethBridger = await EthBridger.fromProvider(this.sourceChainProvider)
    const tx = await ethBridger.withdraw({
      amount,
      l2Signer: signer,
      destinationAddress: address,
      from: address
    })

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: tx,
      destinationChainProvider: this.destinationChainProvider
    }

    // const txReceipt = await tx.wait()

    // if (txLifecycle?.onTxConfirm) {
    //   txLifecycle.onTxConfirm({
    //     txReceipt,
    //     oldBridgeCompatibleTxObjToBeRemovedLater
    //   })
    // }

    // return {
    //   sourceChainTxReceipt: txReceipt
    // }
  }
}
