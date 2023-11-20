import { Erc20Bridger } from '@arbitrum/sdk'
import {
  BridgeTransferStarterV2,
  BridgeTransferStarterV2Props,
  TransferProps
} from './BridgeTransferStarterV2'
import { utils } from 'ethers'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { NewTransaction } from '../../hooks/useTransactions'
import { MaxUint256 } from '@ethersproject/constants'
import {
  fetchErc20Data,
  fetchErc20L2GatewayAddress
} from '../../util/TokenUtils'
import { checkSignerIsValidForDepositOrWithdrawal } from './core/checkSignerIsValidForDepositOrWithdrawal'
import { checkValidDestinationAddress } from './core/checkValidDestinationAddress'
import {
  isAllowedL2,
  tokenRequiresApprovalOnL2
} from '../../util/L2ApprovalUtils'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'

export class Erc20WithdrawalStarterV2 extends BridgeTransferStarterV2 {
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

      if (!selectedToken) throw Error('No token selected')

      if (!isSmartContractWallet) {
        const withdrawalConfirmation = await externalCallbacks[
          'confirmWithdrawal'
        ]?.()
        if (!withdrawalConfirmation) {
          throw Error('User declined the transfer')
        }
      }

      const tokenAddress = selectedToken.address

      const address = await connectedSigner.getAddress()

      if (
        tokenRequiresApprovalOnL2(tokenAddress, sourceChainId) &&
        selectedToken.l2Address
      ) {
        const allowed = await isAllowedL2({
          l1TokenAddress: selectedToken.address,
          l2TokenAddress: selectedToken.l2Address,
          walletAddress: address,
          amountNeeded: amount,
          l2Provider: sourceChainProvider
        })

        if (!allowed) {
          if (isSmartContractWallet) {
            await externalCallbacks['showDelayInSmartContractTransaction']?.()
          }

          const gatewayAddress = await fetchErc20L2GatewayAddress({
            erc20L1Address: tokenAddress,
            l2Provider: sourceChainProvider
          })
          const contract = await ERC20__factory.connect(
            selectedToken.l2Address,
            connectedSigner
          )

          // approval transaction
          await contract.functions.approve(gatewayAddress, MaxUint256)
        }
      }

      if (isSmartContractWallet) {
        await externalCallbacks['showDelayInSmartContractTransaction']?.()
      }

      const erc20Bridger = await Erc20Bridger.fromProvider(sourceChainProvider)
      const provider = connectedSigner.provider
      const isSmartContractAddress =
        provider &&
        (await provider.getCode(String(selectedToken.address))).length < 2

      if (isSmartContractAddress && !destinationAddress) {
        throw new Error(`Missing destination address`)
      }

      const { symbol, decimals } = await fetchErc20Data({
        address: tokenAddress,
        provider: destinationChainProvider
      })

      const tx = await erc20Bridger.withdraw({
        l2Signer: connectedSigner,
        erc20l1Address: tokenAddress,
        destinationAddress: destinationAddress ?? address,
        amount
      })

      const oldBridgeCompatibleTxObjToBeRemovedLater = {
        type: 'withdraw',
        status: 'pending',
        value: utils.formatUnits(amount, decimals),
        txID: tx.hash,
        assetName: symbol,
        assetType: AssetType.ERC20,
        tokenAddress,
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
    } catch (error) {
      if (txLifecycle?.onTxError) {
        txLifecycle.onTxError(error)
      }
      throw error
    }
  }
}
