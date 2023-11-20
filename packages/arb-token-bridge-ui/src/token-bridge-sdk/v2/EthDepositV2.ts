import { EthBridger } from '@arbitrum/sdk'
import {
  BridgeTransferStarterV2,
  BridgeTransferStarterV2Props,
  TransferProps
} from './BridgeTransferStarterV2'
import { approveCustomFeeTokenForInbox } from './core/approveCustomFeeTokenForInbox'
import { utils } from 'ethers'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { NewTransaction } from '../../hooks/useTransactions'
import { checkSignerIsValidForDepositOrWithdrawal } from './core/checkSignerIsValidForDepositOrWithdrawal'

export class EthDepositStarterV2 extends BridgeTransferStarterV2 {
  constructor(props: BridgeTransferStarterV2Props) {
    super(props)
  }

  public async transfer({ externalCallbacks, txLifecycle }: TransferProps) {
    const {
      amount,
      destinationAddress,
      sourceChainProvider,
      destinationChainProvider,
      connectedSigner,
      nativeCurrency
    } = this

    const sourceChainNetwork = await sourceChainProvider.getNetwork()
    const sourceChainId = sourceChainNetwork.chainId

    const destinationChainNetwork = await destinationChainProvider.getNetwork()
    const destinationChainId = destinationChainNetwork.chainId

    // todo: removed code for switchNetworkAndTransfer + analytics, but now since the classes are pure (dont allow cross chain switching) we can ignore that?
    // it also had some analytics code related to that
    // todo: on bridge UI - actually switch the network when users press the round switch button, so that users are always connected to the correct FROM network

    if (!connectedSigner) throw Error('Signer not connected!')

    // check if the signer connected is a valid baseChain signer
    const isValidDepositChain = await checkSignerIsValidForDepositOrWithdrawal({
      connectedSigner,
      destinationChainId,
      transferType: 'deposit'
    })
    if (!isValidDepositChain)
      throw Error(
        'Connected signer is not valid for deposits. Please connect to valid network.'
      )

    const address = await connectedSigner.getAddress()

    if (nativeCurrency.isCustom) {
      const customFeeTokenApproval = await approveCustomFeeTokenForInbox({
        address,
        amount,
        l1Signer: connectedSigner,
        l1Provider: sourceChainProvider,
        l2Provider: destinationChainProvider,
        nativeCurrency,
        customFeeTokenApproval: externalCallbacks['customFeeTokenApproval']
      })

      if (!customFeeTokenApproval) {
        throw Error('Custom fee token not approved')
      }
    }

    const ethBridger = await EthBridger.fromProvider(destinationChainProvider)

    try {
      const tx = await ethBridger.deposit({
        amount,
        l1Signer: connectedSigner
      })

      // todo: Make the callbacks better
      // make the callback return a unified BridgeTransfer object and make it track/poll status on it's own
      const oldBridgeCompatibleTxObjToBeRemovedLater = {
        type: 'deposit-l1',
        status: 'pending',
        value: utils.formatEther(amount),
        txID: tx.hash,
        assetName: 'ETH',
        assetType: AssetType.ETH,
        sender: address,
        destination: destinationAddress ?? address,
        l1NetworkID: sourceChainId.toString(),
        l2NetworkID: destinationChainId.toString()
      } as NewTransaction

      if (txLifecycle?.onTxSubmit) {
        txLifecycle.onTxSubmit({ tx, oldBridgeCompatibleTxObjToBeRemovedLater })
      }

      const txReceipt = await tx.wait()

      if (txLifecycle?.onTxConfirm) {
        txLifecycle.onTxConfirm({
          txReceipt,
          oldBridgeCompatibleTxObjToBeRemovedLater
        })
      }

      return {
        sourceChainTxReceipt: txReceipt
      }
    } catch (error: any) {
      if (txLifecycle?.onTxError) {
        txLifecycle.onTxError(error)
      }
      throw error
    }
  }
}
