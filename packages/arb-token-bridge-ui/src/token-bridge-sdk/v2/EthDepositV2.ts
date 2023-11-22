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

import { requiresNativeCurrencyApproval } from './core/requiresNativeCurrencyApproval'
import { approveNativeCurrency } from './core/approveNativeCurrency'
import { getChainIdFromProvider } from './core/getChainIdFromProvider'

export class EthDepositStarterV2 extends BridgeTransferStarterV2 {
  constructor(props: BridgeTransferStarterV2Props) {
    super(props)
  }

  public requiresNativeCurrencyApproval = requiresNativeCurrencyApproval

  public approveNativeCurrency = approveNativeCurrency

  public async transfer({
    amount,
    destinationAddress,
    sourceChainProvider,
    destinationChainProvider,
    connectedSigner,
    nativeCurrency,
    isSmartContractWallet,
    txLifecycle
  }) {
    try {
      const sourceChainId = await getChainIdFromProvider(sourceChainProvider)

      const destinationChainId = await getChainIdFromProvider(
        destinationChainProvider
      )

      const address = await connectedSigner.getAddress()

      if (isSmartContractWallet) {
        throw Error("ETH transfers aren't enabled for smart contract wallets.")
      }

      const ethBridger = await EthBridger.fromProvider(destinationChainProvider)
      const tx = await ethBridger.deposit({
        amount,
        l1Signer: connectedSigner
      })

      return {
        type: 'eth_deposit',
        status: 'pending',
        sourceChain: {
          provider: sourceChainProvider,
          tx
        },
        destination: {
          provider: destinationChainProvider
        }
      }

      // todo: Make the callbacks better
      // make the callback return a unified BridgeTransfer object and make it track/poll status on it's own
      const oldBridgeCompatibleTxObjToBeRemovedLater = {
        type: 'deposit-l1',
        status: 'pending',
        value: utils.formatUnits(amount, nativeCurrency.decimals),
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
