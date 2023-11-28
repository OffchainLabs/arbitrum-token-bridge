import { EthBridger } from '@arbitrum/sdk'
import {
  BridgeTransferStarterV2,
  BridgeTransferStarterV2Props,
  TransferProps,
  TransferType
} from './BridgeTransferStarterV2'
import { requiresNativeCurrencyApproval } from './core/requiresNativeCurrencyApproval'
import { approveNativeCurrency } from './core/approveNativeCurrency'
import { getProviderFromSigner } from './core/getProviderFromSigner'

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

  public async transfer({
    amount,
    destinationChainProvider,
    connectedSigner
  }: TransferProps) {
    try {
      const sourceChainProvider = getProviderFromSigner(connectedSigner)

      const ethBridger = await EthBridger.fromProvider(destinationChainProvider)
      const tx = await ethBridger.deposit({
        amount,
        l1Signer: connectedSigner
      })

      return {
        transferType: this.transferType,
        status: 'pending',
        sourceChainProvider,
        sourceChainTransaction: tx,
        destinationChainProvider
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
    } catch (error: any) {
      // if (txLifecycle?.onTxError) {
      //   txLifecycle.onTxError(error)
      // }
      throw error
    }
  }
}
