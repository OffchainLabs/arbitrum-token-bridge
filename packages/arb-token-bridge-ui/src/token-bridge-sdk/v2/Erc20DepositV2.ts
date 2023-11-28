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
    // nativeCurrency,
    selectedToken
  }: TransferProps & { selectedToken: SelectedToken }) {
    try {
      // // validate the destination address, else throw error
      // await checkValidDestinationAddress({
      //   destinationAddress,
      //   isSmartContractWallet
      // })

      // if (!selectedToken) throw Error('No token selected')

      // const tokenAddress = selectedToken.sourceChainErc20ContractAddress
      // if (!tokenAddress) throw Error('Token not deployed on source chain.')

      // const address = await connectedSigner.getAddress()

      // // throw warning if the token is a part of warning token list
      // const warning = await checkForWarningTokens(tokenAddress)
      // if (warning) throw Error(warning)

      // // check for first time token deployment from user
      // const userConfirmationForFirstTimeTokenBridging = await externalCallbacks[
      //   'firstTimeTokenBridgingConfirmation'
      // ]?.()
      // if (!userConfirmationForFirstTimeTokenBridging) {
      //   throw Error('User declined bridging the token for the first time')
      // }

      // // check that a registration is not currently in progress
      // const l2RoutedAddress = await getL2ERC20Address({
      //   erc20L1Address: tokenAddress,
      //   l1Provider: sourceChainProvider,
      //   l2Provider: destinationChainProvider
      // })

      // // check if the token is suspended
      // if (
      //   selectedToken.destinationChainErc20ContractAddress &&
      //   selectedToken.destinationChainErc20ContractAddress.toLowerCase() !==
      //     l2RoutedAddress.toLowerCase()
      // ) {
      //   const message =
      //     'Depositing is currently suspended for this token as a new gateway is being registered. Please try again later and contact support if this issue persists.'
      //   alert(message)
      //   throw Error(message)
      // }

      // // check if the token is non-canonical
      // if (isNonCanonicalToken(tokenAddress)) {
      //   const canonicalBridgeDepositConfirmation = await externalCallbacks[
      //     'canonicalBridgeDepositConfirmation'
      //   ]?.()

      //   if (!canonicalBridgeDepositConfirmation) {
      //     throw Error('Deposit via canonical bridge declined')
      //   }
      // }

      // if (nativeCurrency.isCustom) {
      //   const customFeeTokenApproval = await approveCustomFeeTokenForInbox({
      //     address,
      //     amount,
      //     l1Signer: connectedSigner,
      //     l1Provider: sourceChainProvider,
      //     l2Provider: destinationChainProvider,
      //     nativeCurrency,
      //     customFeeTokenApproval: externalCallbacks['customFeeTokenApproval']
      //   })

      //   if (!customFeeTokenApproval) {
      //     throw Error('Custom fee token not approved')
      //   }
      // }

      // const tokenAllowanceApproval = await approveTokenAllowance({
      //   address,
      //   amount,
      //   tokenAddress,
      //   spender: l1GatewayAddress,
      //   nativeCurrency,
      //   l1Signer: connectedSigner,
      //   l1Provider: sourceChainProvider,
      //   l2Provider: destinationChainProvider,
      //   tokenAllowanceApproval: externalCallbacks['tokenAllowanceApproval']
      // })

      // if (!tokenAllowanceApproval) {
      //   throw Error('Token allowance not approved')
      // }

      // if (
      //   isSmartContractWallet &&
      //   externalCallbacks['showDelayInSmartContractTransaction']
      // ) {
      //   await externalCallbacks['showDelayInSmartContractTransaction']?.()
      // }

      const sourceChainProvider = getProviderFromSigner(connectedSigner)

      const address = await getAddressFromSigner(connectedSigner)

      const tokenAddress = selectedToken.sourceChainErc20ContractAddress

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

      // const { symbol, decimals } = await fetchErc20Data({
      //   address: tokenAddress,
      //   provider: sourceChainProvider
      // })

      // /// move THIS TO UI LAYER
      // const oldBridgeCompatibleTxObjToBeRemovedLater = {
      //   type: 'deposit-l1',
      //   status: 'pending',
      //   value: utils.formatUnits(amount, decimals),
      //   txID: tx.hash,
      //   assetName: symbol,
      //   assetType: AssetType.ERC20,
      //   tokenAddress,
      //   sender: address,
      //   destination: destinationAddress ?? address,
      //   l1NetworkID: sourceChainId.toString(),
      //   l2NetworkID: destinationChainId.toString()
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
    } catch (error) {
      // if (txLifecycle?.onTxError) {
      //   txLifecycle.onTxError(error)
      // }
      throw error
    }
  }
}
