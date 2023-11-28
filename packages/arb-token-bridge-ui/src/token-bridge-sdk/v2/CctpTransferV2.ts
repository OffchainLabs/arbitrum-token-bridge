import {
  BridgeTransferStarterV2,
  BridgeTransferStarterV2Props,
  TransferProps
} from './BridgeTransferStarterV2'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { approveTokenAllowance } from './core/approveTokenAllowance'
import { checkSignerIsValidForDepositOrWithdrawal } from './core/checkSignerIsValidForTransferType'
import { Erc20DepositStarterV2 } from './Erc20DepositV2'
import { fetchPerMessageBurnLimit } from '../../hooks/CCTP/fetchCCTPLimits'
import { formatAmount } from '../../util/NumberUtils'
import { getContracts } from '../../hooks/CCTP/useCCTP'
import { cctpContracts } from './core/cctpContracts'
import { getAttestationHashAndMessageFromReceipt } from '../../util/cctp/getAttestationHashAndMessageFromReceipt'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { getStandardizedTimestamp } from '../../state/app/utils'
import { getUsdcTokenAddressFromSourceChainId } from '../../state/cctpState'
import { checkValidDestinationAddress } from './core/checkValidDestinationAddress'
import { utils } from 'ethers'
import {
  RequiresTokenApprovalProps,
  requiresTokenApproval
} from './core/requiresTokenApproval'
import { getChainIdFromProvider } from './core/getChainIdFromProvider'
import { getProviderFromSigner } from './core/getProviderFromSigner'
import { getAddressFromSigner } from './core/getAddressFromSigner'
import { getBridgeTransferProperties } from './core/getBridgeTransferProperties'

export class CctpTransferStarterV2 extends BridgeTransferStarterV2 {
  constructor(props: BridgeTransferStarterV2Props) {
    super(props)
  }
  public async requiresTokenApproval({
    amount,
    address,
    sourceChainProvider,
    destinationAddress
  }: RequiresTokenApprovalProps): Promise<boolean> {
    const sourceChainId = await getChainIdFromProvider(sourceChainProvider)
    const recipient = destinationAddress ?? address
    const { usdcContractAddress, tokenMessengerContractAddress } =
      getContracts(sourceChainId)

    return await requiresTokenApproval({
      address: recipient,
      amount,
      tokenAddress: usdcContractAddress,
      spender: tokenMessengerContractAddress,
      sourceChainProvider
    })
  }

  public async transfer({
    amount,
    destinationAddress,
    destinationChainProvider,
    connectedSigner,
    selectedToken
  }: TransferProps) {
    try {
      // const {
      //   amount,
      //   destinationAddress,
      //   sourceChainProvider,
      //   destinationChainProvider,
      //   connectedSigner,
      //   nativeCurrency,
      //   selectedToken,
      //   isSmartContractWallet
      // } = this

      const sourceChainProvider = getProviderFromSigner(connectedSigner)
      const sourceChainId = await getChainIdFromProvider(sourceChainProvider)

      const address = await getAddressFromSigner(connectedSigner)

      const { isDeposit } = await getBridgeTransferProperties({
        sourceChainProvider,
        destinationChainProvider,
        selectedToken
      })

      // const destinationChainNetwork =
      //   await destinationChainProvider.getNetwork()
      // const destinationChainId = destinationChainNetwork.chainId

      // if (!connectedSigner) throw Error('Signer not connected!')

      // if (!selectedToken) throw Error('No token selected')

      // const tokenAddress = selectedToken.sourceChainErc20ContractAddress
      // if (!tokenAddress) throw Error('Token not deployed on source chain!')

      // if (!address)
      //   throw Error('Please connect your wallet before making the transfer')

      // // check if the signer connected is a valid signer
      // const isValidDepositChain =
      //   await checkSignerIsValidForDepositOrWithdrawal({
      //     connectedSigner,
      //     destinationChainId,
      //     transferType: 'deposit'
      //   })
      // if (!isValidDepositChain)
      //   throw Error(
      //     'Connected signer is not valid for deposits. Please connect to valid network.'
      //   )

      // // validate the destination address, else throw error
      // await checkValidDestinationAddress({
      //   destinationAddress,
      //   isSmartContractWallet
      // })

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
      // const { usdcContractAddress, tokenMessengerContractAddress } =
      //   getContracts(sourceChainId)
      // const tokenAllowanceApproval = await approveTokenAllowance({
      //   address: recipient,
      //   amount,
      //   tokenAddress: usdcContractAddress,
      //   spender: tokenMessengerContractAddress,
      //   nativeCurrency,
      //   l1Signer: connectedSigner,
      //   l1Provider: sourceChainProvider,
      //   l2Provider: destinationChainProvider,
      //   tokenAllowanceApproval: externalCallbacks['tokenAllowanceApprovalCctp']
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
        type: 'cctp_withdrawal',
        status: 'pending',
        sourceChain: {
          provider: sourceChainProvider,
          tx: { hash: depositForBurnTx.hash }
        },
        destination: {
          provider: destinationChainProvider
        }
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
