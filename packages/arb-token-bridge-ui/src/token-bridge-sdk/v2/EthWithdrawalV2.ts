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

  public async transfer({
    amount,
    destinationChainProvider,
    connectedSigner
  }: TransferProps) {
    try {
      const sourceChainProvider = getProviderFromSigner(connectedSigner)

      const address = await getAddressFromSigner(connectedSigner)

      const ethBridger = await EthBridger.fromProvider(sourceChainProvider)
      const tx = await ethBridger.withdraw({
        amount,
        l2Signer: connectedSigner,
        destinationAddress: address,
        from: address
      })

      return {
        transferType: this.transferType,
        status: 'pending',
        sourceChainProvider,
        sourceChainTransaction: tx,
        destinationChainProvider
      }

      // // todo: Make the callbacks better
      // // make the callback return a unified BridgeTransfer object and make it track/poll status on it's own
      // const oldBridgeCompatibleTxObjToBeRemovedLater = {
      //   type: 'withdraw',
      //   status: 'pending',
      //   value: utils.formatUnits(amount, nativeCurrency.decimals),
      //   txID: tx.hash,
      //   assetName: 'ETH',
      //   assetType: AssetType.ETH,
      //   sender: address,
      //   destination: destinationAddress ?? address,
      //   l1NetworkID: destinationChainId.toString(),
      //   l2NetworkID: sourceChainId.toString()
      // } as NewTransaction

      // if (txLifecycle?.onTxSubmit) {
      //   txLifecycle.onTxSubmit({ tx, oldBridgeCompatibleTxObjToBeRemovedLater })
      // }

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
    } catch (error: any) {
      // if (txLifecycle?.onTxError) {
      //   txLifecycle.onTxError(error)
      // }
      throw error
    }
  }
}
