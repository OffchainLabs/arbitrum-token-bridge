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
import {
  fetchErc20Data,
  fetchErc20L1GatewayAddress,
  getL2ERC20Address
} from '../../util/TokenUtils'
import { isNonCanonicalToken } from './core/isNonCanonicalToken'
import { approveTokenAllowance } from './core/approveTokenAllowance'
import { checkSignerIsValidForDepositOrWithdrawal } from './core/checkSignerIsValidForDepositOrWithdrawal'
import { checkValidDestinationAddress } from './core/checkValidDestinationAddress'

export class Erc20DepositStarterV2 extends BridgeTransferStarterV2 {
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
        nativeCurrency,
        selectedToken,
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
      const isValidDepositChain =
        await checkSignerIsValidForDepositOrWithdrawal({
          connectedSigner,
          destinationChainId,
          transferType: 'deposit'
        })
      if (!isValidDepositChain)
        throw Error(
          'Connected signer is not valid for deposits. Please connect to valid network.'
        )

      // validate the destination address, else throw error
      await checkValidDestinationAddress({
        destinationAddress,
        isSmartContractWallet
      })

      if (!selectedToken) throw Error('No token selected')

      const tokenAddress = selectedToken.sourceChainErc20ContractAddress
      if (!tokenAddress) throw Error('Token not deployed on source chain.')

      const address = await connectedSigner.getAddress()

      // throw warning if the token is a part of warning token list
      const warning = await checkForWarningTokens(tokenAddress)
      if (warning) throw Error(warning)

      // check for first time token deployment from user
      const userConfirmationForFirstTimeTokenBridging = await externalCallbacks[
        'firstTimeTokenBridgingConfirmation'
      ]?.()
      if (!userConfirmationForFirstTimeTokenBridging) {
        throw Error('User declined bridging the token for the first time')
      }

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
        const canonicalBridgeDepositConfirmation = await externalCallbacks[
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

      const l1GatewayAddress = await fetchErc20L1GatewayAddress({
        erc20L1Address: tokenAddress,
        l1Provider: sourceChainProvider,
        l2Provider: destinationChainProvider
      })

      const tokenAllowanceApproval = await approveTokenAllowance({
        address,
        amount,
        tokenAddress,
        spender: l1GatewayAddress,
        nativeCurrency,
        l1Signer: connectedSigner,
        l1Provider: sourceChainProvider,
        l2Provider: destinationChainProvider,
        tokenAllowanceApproval: externalCallbacks['tokenAllowanceApproval']
      })

      if (!tokenAllowanceApproval) {
        throw Error('Token allowance not approved')
      }

      if (
        isSmartContractWallet &&
        externalCallbacks['showDelayInSmartContractTransaction']
      ) {
        await externalCallbacks['showDelayInSmartContractTransaction']?.()
      }

      const erc20Bridger = await Erc20Bridger.fromProvider(
        destinationChainProvider
      )

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
        l1Signer: connectedSigner
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
    } catch (error) {
      if (txLifecycle?.onTxError) {
        txLifecycle.onTxError(error)
      }
      throw error
    }
  }
}
