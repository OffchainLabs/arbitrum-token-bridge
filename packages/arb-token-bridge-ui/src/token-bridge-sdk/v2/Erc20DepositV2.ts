import { Erc20Bridger } from '@arbitrum/sdk'
import {
  BridgeTransferStarterV2,
  BridgeTransferStarterV2Props,
  TransferProps
} from './BridgeTransferStarterV2'
import { approveCustomFeeTokenForInbox } from './core/approveCustomFeeTokenForInbox'
import { utils } from 'ethers'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { NewTransaction } from '../../hooks/useTransactions'
import { checkForWarningTokens } from './core/checkForWarningTokens'
import { fetchErc20Data, getL2ERC20Address } from '../../util/TokenUtils'
import { isNonCanonicalToken } from './core/isNonCanonicalToken'
import { approveTokenAllowance } from './core/approveTokenAllowance'

export class Erc20DepositStarterV2 extends BridgeTransferStarterV2 {
  constructor(props: BridgeTransferStarterV2Props) {
    super(props)
  }

  public async transfer({ confirmationCallbacks, txLifecycle }: TransferProps) {
    const {
      amount,
      destinationAddress,
      sourceChainProvider,
      destinationChainProvider,
      sourceChainSigner,
      nativeCurrency,
      selectedToken,
      isSmartContractWallet
    } = this

    const sourceChainNetwork = await sourceChainProvider.getNetwork()
    const sourceChainId = sourceChainNetwork.chainId

    const destinationChainNetwork = await destinationChainProvider.getNetwork()
    const destinationChainId = destinationChainNetwork.chainId

    // todo: removed code for switchNetworkAndTransfer + analytics, but now since the classes are pure (dont allow cross chain switching) we can ignore that?
    // it also had some analytics code related to that
    // todo: on bridge UI - actually switch the network when users press the round switch button, so that users are always connected to the correct FROM network

    if (!sourceChainSigner) throw Error('Signer not connected!')

    if (!selectedToken) throw Error('No token selected')

    const tokenAddress = selectedToken.sourceChainErc20ContractAddress
    if (!tokenAddress) throw Error('Token not deployed on source chain!')

    // throw warning if the token is a part of warning token list
    const warning = await checkForWarningTokens(tokenAddress)
    if (warning) throw Error(warning)

    const address = await sourceChainSigner.getAddress()

    // check that a registration is not currently in progress
    const l2RoutedAddress = await getL2ERC20Address({
      erc20L1Address: tokenAddress,
      l1Provider: sourceChainProvider,
      l2Provider: destinationChainProvider
    })

    // check if the token is suspended
    if (
      selectedToken.destinationChainErc20ContractAddress &&
      selectedToken.destinationChainErc20ContractAddress.toLowerCase() !==
        l2RoutedAddress.toLowerCase()
    ) {
      const message =
        'Depositing is currently suspended for this token as a new gateway is being registered. Please try again later and contact support if this issue persists.'
      alert(message)
      throw Error(message)
    }

    // check if the token is non-canonical
    if (isNonCanonicalToken(tokenAddress)) {
      const canonicalBridgeDepositConfirmation = await confirmationCallbacks[
        'canonicalBridgeDepositConfirmation'
      ]?.()

      if (!canonicalBridgeDepositConfirmation) {
        throw Error('Deposit via canonical bridge declined')
      }
    }

    if (nativeCurrency.isCustom) {
      const customFeeTokenApproval = await approveCustomFeeTokenForInbox({
        address,
        amount,
        l1Signer: sourceChainSigner,
        l1Provider: sourceChainProvider,
        l2Provider: destinationChainProvider,
        nativeCurrency,
        customFeeTokenApproval: confirmationCallbacks['customFeeTokenApproval']
      })

      if (!customFeeTokenApproval) {
        throw Error('Custom fee token not approved')
      }
    }

    const tokenAllowanceApproval = await approveTokenAllowance({
      address,
      amount,
      sourceChainErc20ContractAddress: tokenAddress,
      l1Signer: sourceChainSigner,
      l1Provider: sourceChainProvider,
      l2Provider: destinationChainProvider,
      nativeCurrency,
      tokenAllowanceApproval: confirmationCallbacks['tokenAllowanceApproval']
    })

    if (!tokenAllowanceApproval) {
      throw Error('Token allowance not approved')
    }

    if (isSmartContractWallet) {
      await confirmationCallbacks['showDelayInSmartContractTransaction']?.()
    }

    const erc20Bridger = await Erc20Bridger.fromProvider(
      destinationChainProvider
    )

    try {
      const { symbol, decimals } = await fetchErc20Data({
        address: tokenAddress,
        provider: sourceChainProvider
      })

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
        l1Signer: sourceChainSigner
      })

      const oldBridgeCompatibleTxObjToBeRemovedLater = {
        type: 'deposit-l1',
        status: 'pending',
        value: utils.formatUnits(amount, decimals),
        txID: tx.hash,
        assetName: symbol,
        assetType: AssetType.ERC20,
        tokenAddress,
        sender: address,
        destination: destinationAddress ?? address,
        l1NetworkID: sourceChainId.toString(),
        l2NetworkID: destinationChainId.toString()
      } as NewTransaction

      if (txLifecycle?.onTxSubmit) {
        txLifecycle.onTxSubmit(tx, oldBridgeCompatibleTxObjToBeRemovedLater)
      }

      const receipt = await tx.wait()

      if (txLifecycle?.onTxConfirm) {
        txLifecycle.onTxConfirm(receipt)
      }

      return {
        sourceChainTxReceipt: receipt
      }
    } catch (error) {
      if (txLifecycle?.onTxError) {
        txLifecycle.onTxError(error)
      }
      throw error
    }
  }
}
