import { Erc20Bridger } from '@arbitrum/sdk'
import {
  BridgeTransferStarterV2,
  BridgeTransferStarterV2Props,
  SelectedToken,
  TransferProps,
  TransferType
} from './BridgeTransferStarterV2'
import { approveNativeCurrency } from './core/approveNativeCurrency'
import { fetchErc20L1GatewayAddress } from '../../util/TokenUtils'
import { requiresNativeCurrencyApproval } from './core/requiresNativeCurrencyApproval'
import {
  RequiresTokenApprovalProps,
  requiresTokenApproval
} from './core/requiresTokenApproval'
import { approveToken } from './core/approveToken'
import { getProviderFromSigner } from './core/getProviderFromSigner'
import { getAddressFromSigner } from './core/getAddressFromSigner'
import { Provider } from '@ethersproject/providers'

export class Erc20DepositStarterV2 extends BridgeTransferStarterV2 {
  public transferType: TransferType = 'erc20_deposit'

  constructor(props: BridgeTransferStarterV2Props) {
    super(props)
  }

  public requiresNativeCurrencyApproval = requiresNativeCurrencyApproval

  public approveNativeCurrency = approveNativeCurrency

  public requiresTokenApproval = async ({
    amount,
    address,
    selectedToken,
    sourceChainProvider,
    destinationChainProvider
  }: RequiresTokenApprovalProps & { destinationChainProvider: Provider }) => {
    const l1GatewayAddress = await fetchErc20L1GatewayAddress({
      erc20L1Address: selectedToken.address,
      l1Provider: sourceChainProvider,
      l2Provider: destinationChainProvider
    })
    return requiresTokenApproval({
      amount,
      address,
      selectedToken,
      sourceChainProvider,
      spender: l1GatewayAddress
    })
  }

  public approveToken = approveToken

  public async transfer({
    amount,
    destinationAddress,
    destinationChainProvider,
    connectedSigner,
    selectedToken
  }: TransferProps & { selectedToken: SelectedToken }) {
    try {
      const sourceChainProvider = getProviderFromSigner(connectedSigner)

      const address = await getAddressFromSigner(connectedSigner)

      const tokenAddress = selectedToken.address

      const erc20Bridger = await Erc20Bridger.fromProvider(
        destinationChainProvider
      )

      const depositRequest = await erc20Bridger.getDepositRequest({
        l1Provider: sourceChainProvider,
        l2Provider: destinationChainProvider,
        from: address,
        erc20L1Address: tokenAddress,
        destinationAddress,
        amount
      })

      const tx = await erc20Bridger.deposit({
        ...depositRequest,
        l1Signer: connectedSigner
      })

      return {
        transferType: this.transferType,
        status: 'pending',
        sourceChainProvider,
        sourceChainTransaction: tx,
        destinationChainProvider
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
    } catch (error) {
      // if (txLifecycle?.onTxError) {
      //   txLifecycle.onTxError(error)
      // }
      throw error
    }
  }
}
