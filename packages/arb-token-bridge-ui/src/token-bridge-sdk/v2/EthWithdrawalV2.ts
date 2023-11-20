import { EthBridger } from '@arbitrum/sdk'
import {
  BridgeTransferStarterV2,
  BridgeTransferStarterV2Props,
  TransferProps
} from './BridgeTransferStarterV2'
import { utils } from 'ethers'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { NewTransaction } from '../../hooks/useTransactions'
import { checkSignerIsValidForDepositOrWithdrawal } from './core/checkSignerIsValidForDepositOrWithdrawal'
import { checkValidDestinationAddress } from './core/checkValidDestinationAddress'

export class EthWithdrawalStarterV2 extends BridgeTransferStarterV2 {
  constructor(props: BridgeTransferStarterV2Props) {
    super(props)
  }

  public async transfer({ externalCallbacks, txLifecycle }: TransferProps) {
    try {
      const {
        amount,
        destinationAddress,
        sourceChainProvider,
        destinationChainProvider,
        connectedSigner,
        isSmartContractWallet
      } = this

      const sourceChainNetwork = await sourceChainProvider.getNetwork()
      const sourceChainId = sourceChainNetwork.chainId

      const destinationChainNetwork =
        await destinationChainProvider.getNetwork()
      const destinationChainId = destinationChainNetwork.chainId

      // todo: removed code for switchNetworkAndTransfer + analytics, but now since the classes are pure (dont allow cross chain switching) we can ignore that?
      // it also had some analytics code related to that
      // todo: on bridge UI - actually switch the network when users press the round switch button, so that users are always connected to the correct FROM network

      if (!connectedSigner) throw Error('Signer not connected!')

      // check if the signer connected is a valid signer
      const isValidWithdrawalChain =
        await checkSignerIsValidForDepositOrWithdrawal({
          connectedSigner,
          destinationChainId,
          transferType: 'withdrawal'
        })
      if (!isValidWithdrawalChain)
        throw Error(
          'Connected signer is not valid for withdrawals. Please connect to valid network.'
        )

      // validate the destination address, else throw error
      await checkValidDestinationAddress({
        destinationAddress,
        isSmartContractWallet
      })

      if (isSmartContractWallet) {
        throw Error("ETH transfers aren't enabled for smart contract wallets.")
      }

      // get withdrawal confirmation
      const withdrawalConfirmation = await externalCallbacks[
        'confirmWithdrawal'
      ]?.()
      if (!withdrawalConfirmation) {
        throw Error('User declined the transfer')
      }

      const address = await connectedSigner.getAddress()

      const ethBridger = await EthBridger.fromProvider(sourceChainProvider)
      const tx = await ethBridger.withdraw({
        amount,
        l2Signer: connectedSigner,
        destinationAddress: address,
        from: address
      })

      // todo: Make the callbacks better
      // make the callback return a unified BridgeTransfer object and make it track/poll status on it's own
      const oldBridgeCompatibleTxObjToBeRemovedLater = {
        type: 'withdraw',
        status: 'pending',
        value: utils.formatEther(amount),
        txID: tx.hash,
        assetName: 'ETH',
        assetType: AssetType.ETH,
        sender: address,
        destination: destinationAddress ?? address,
        l1NetworkID: destinationChainId.toString(),
        l2NetworkID: sourceChainId.toString()
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
