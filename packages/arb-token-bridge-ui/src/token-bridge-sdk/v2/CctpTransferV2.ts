import {
  BridgeTransferStarterV2,
  BridgeTransferStarterV2Props,
  SelectedToken,
  TransferProps,
  TransferType
} from './BridgeTransferStarterV2'
import { fetchPerMessageBurnLimit } from '../../hooks/CCTP/fetchCCTPLimits'
import { formatAmount } from '../../util/NumberUtils'
import { getContracts } from '../../hooks/CCTP/useCCTP'
import { cctpContracts } from './core/cctpContracts'
import {
  RequiresTokenApprovalProps,
  requiresTokenApproval
} from './core/requiresTokenApproval'
import { getChainIdFromProvider } from './core/getChainIdFromProvider'
import { getProviderFromSigner } from './core/getProviderFromSigner'
import { getAddressFromSigner } from './core/getAddressFromSigner'
import { ApproveTokenProps, approveToken } from './core/approveToken'
import { requiresNativeCurrencyApproval } from './core/requiresNativeCurrencyApproval'
import { approveNativeCurrency } from './core/approveNativeCurrency'

export class CctpTransferStarterV2 extends BridgeTransferStarterV2 {
  public transferType: TransferType

  constructor(props: BridgeTransferStarterV2Props & { isDeposit: boolean }) {
    super(props)
    this.transferType = props.isDeposit ? 'usdc_deposit' : 'usdc_withdrawal'
  }

  public requiresNativeCurrencyApproval = requiresNativeCurrencyApproval

  public approveNativeCurrency = approveNativeCurrency

  public async requiresTokenApproval({
    amount,
    address,
    sourceChainProvider,
    selectedToken,
    destinationAddress
  }: RequiresTokenApprovalProps): Promise<boolean> {
    const sourceChainId = await getChainIdFromProvider(sourceChainProvider)
    const recipient = destinationAddress ?? address
    const { usdcContractAddress, tokenMessengerContractAddress } =
      getContracts(sourceChainId)

    return await requiresTokenApproval({
      address: recipient,
      amount,
      selectedToken: { ...selectedToken, address: usdcContractAddress },
      spender: tokenMessengerContractAddress,
      sourceChainProvider
    })
  }

  public async approveToken({
    connectedSigner,
    selectedToken,
    destinationChainProvider
  }: ApproveTokenProps) {
    const sourceChainProvider = getProviderFromSigner(connectedSigner)
    const sourceChainId = await getChainIdFromProvider(sourceChainProvider)

    const { usdcContractAddress } = getContracts(sourceChainId)
    return await approveToken({
      connectedSigner,
      selectedToken: { ...selectedToken, address: usdcContractAddress },
      destinationChainProvider
    })
  }

  public async transfer({
    amount,
    destinationAddress,
    destinationChainProvider,
    connectedSigner,
    selectedToken
  }: TransferProps & { selectedToken: SelectedToken }) {
    try {
      const sourceChainProvider = getProviderFromSigner(connectedSigner)
      const sourceChainId = await getChainIdFromProvider(sourceChainProvider)

      const address = await getAddressFromSigner(connectedSigner)

      // const usdcDepositConfirmationAndMode = await externalCallbacks[
      //   'confirmUsdcDepositFromNormalOrCctpBridge'
      // ]?.()

      // // user declines the transfer
      // if (!usdcDepositConfirmationAndMode)
      //   throw Error('User declined the transfer')

      // // user wants to transfer usdc.e by normal bridging and not CCTP
      // if (usdcDepositConfirmationAndMode === 'bridge-normal-usdce') {
      //   // exit and start Erc20 deposit
      //   return await new Erc20DepositStarterV2(this).transfer({
      //     externalCallbacks,
      //     txLifecycle
      //   })
      // }

      // else, continue with cctp deposit...

      // cctp has an upper limit for transfer
      const burnLimit = await fetchPerMessageBurnLimit({
        sourceChainId
      })

      if (burnLimit.lte(amount)) {
        const formatedLimit = formatAmount(burnLimit, {
          decimals: selectedToken.decimals,
          symbol: 'USDC'
        })
        throw Error(
          `The limit for transfers using CCTP is ${formatedLimit}. Please lower your amount and try again.`
        )
      }

      const recipient = destinationAddress || address

      // if (
      //   isSmartContractWallet &&
      //   externalCallbacks['showDelayInSmartContractTransaction']
      // ) {
      //   await externalCallbacks['showDelayInSmartContractTransaction']?.()
      // }

      // approve token for burn
      const tx = await cctpContracts(sourceChainId).approveForBurn(
        amount,
        connectedSigner
      )
      await tx.wait()

      // burn token on the selected chain to be transferred from cctp contracts to the other chain
      const depositForBurnTx = await cctpContracts(
        sourceChainId
      ).depositForBurn({
        amount,
        signer: connectedSigner,
        recipient
      })

      if (!depositForBurnTx) {
        throw Error('USDC deposit transaction failed')
      }

      return {
        transferType: this.transferType,
        status: 'pending',
        sourceChainProvider,
        sourceChainTransaction: depositForBurnTx,
        destinationChainProvider
      }

      // if (isSmartContractWallet) {
      //   // For SCW, we assume that the transaction went through
      //   // call lifecycle methods - onTxSubmit and onTxConfirmed here?
      // }

      // if (!depositForBurnTx) {
      //   throw Error('USDC deposit transaction failed')
      // }

      // const oldBridgeCompatibleTxObjToBeRemovedLater: MergedTransaction = {
      //   txId: depositForBurnTx.hash,
      //   asset: 'USDC',
      //   assetType: AssetType.ERC20,
      //   blockNum: null,
      //   createdAt: getStandardizedTimestamp(new Date().toString()),
      //   direction: 'deposit',
      //   isWithdrawal: false,
      //   resolvedAt: null,
      //   status: 'pending',
      //   uniqueId: null,
      //   value: utils.formatUnits(amount, selectedToken.decimals),
      //   depositStatus: DepositStatus.CCTP_DEFAULT_STATE,
      //   destination: recipient,
      //   sender: address,
      //   isCctp: true,
      //   tokenAddress: getUsdcTokenAddressFromSourceChainId(sourceChainId),
      //   cctpData: {
      //     sourceChainId
      //   }
      // }

      // if (txLifecycle?.onTxSubmit) {
      //   txLifecycle.onTxSubmit({
      //     tx: { hash: depositForBurnTx.hash as string },
      //     oldBridgeCompatibleTxObjToBeRemovedLater
      //   })
      // }

      // const txReceipt = await depositForBurnTx.wait()

      // if (txReceipt.status === 0) {
      //   throw Error('USDC deposit transaction failed')
      // }

      // const { messageBytes, attestationHash } =
      //   getAttestationHashAndMessageFromReceipt(txReceipt)
      // if (messageBytes && attestationHash) {
      //   if (txLifecycle?.onTxConfirm) {
      //     txLifecycle.onTxConfirm({
      //       txReceipt,
      //       oldBridgeCompatibleTxObjToBeRemovedLater: {
      //         ...oldBridgeCompatibleTxObjToBeRemovedLater,
      //         messageBytes,
      //         attestationHash
      //       }
      //     })
      //   }
      // } else {
      //   throw Error('USDC deposit transaction failed')
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
