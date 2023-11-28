import { Erc20Bridger } from '@arbitrum/sdk'
import {
  BridgeTransferStarterV2,
  BridgeTransferStarterV2Props,
  SelectedToken,
  TransferProps,
  TransferType
} from './BridgeTransferStarterV2'
import { MaxUint256 } from '@ethersproject/constants'
import { fetchErc20L2GatewayAddress } from '../../util/TokenUtils'
import {
  isAllowedL2,
  tokenRequiresApprovalOnL2
} from '../../util/L2ApprovalUtils'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { RequiresTokenApprovalProps } from './core/requiresTokenApproval'
import { ApproveTokenProps } from './core/approveToken'
import { getProviderFromSigner } from './core/getProviderFromSigner'
import { requiresNativeCurrencyApproval } from './core/requiresNativeCurrencyApproval'
import { approveNativeCurrency } from './core/approveNativeCurrency'

export class Erc20WithdrawalStarterV2 extends BridgeTransferStarterV2 {
  public transferType: TransferType = 'erc20_withdrawal'

  constructor(props: BridgeTransferStarterV2Props) {
    super(props)
  }

  public requiresNativeCurrencyApproval = requiresNativeCurrencyApproval

  public approveNativeCurrency = approveNativeCurrency

  public requiresTokenApproval = async ({
    amount,
    address,
    selectedToken,
    sourceChainProvider
  }: RequiresTokenApprovalProps) => {
    const tokenAddress = selectedToken.address
    const sourceChainId = await (await sourceChainProvider.getNetwork()).chainId
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

      return !allowed
    }
    return false
  }

  public approveToken = async ({
    connectedSigner,
    selectedToken
  }: ApproveTokenProps) => {
    const sourceChainProvider = getProviderFromSigner(connectedSigner)

    const gatewayAddress = await fetchErc20L2GatewayAddress({
      erc20L1Address: selectedToken.address,
      l2Provider: sourceChainProvider
    })

    if (!selectedToken.l2Address)
      throw new Error('Token address not found for destination chain')

    const contract = await ERC20__factory.connect(
      selectedToken.l2Address,
      connectedSigner
    )

    // approval transaction
    await contract.functions.approve(gatewayAddress, MaxUint256)
  }

  public async transfer({
    amount,
    destinationAddress,
    destinationChainProvider,
    connectedSigner,
    selectedToken
  }: // isSmartContractWallet
  TransferProps & { selectedToken: SelectedToken }) {
    try {
      const tokenAddress = selectedToken.address

      const address = await connectedSigner.getAddress()

      const sourceChainProvider = getProviderFromSigner(connectedSigner)

      const erc20Bridger = await Erc20Bridger.fromProvider(sourceChainProvider)

      const tx = await erc20Bridger.withdraw({
        l2Signer: connectedSigner,
        erc20l1Address: tokenAddress,
        destinationAddress: destinationAddress ?? address,
        amount
      })

      return {
        transferType: this.transferType,
        status: 'pending',
        sourceChainProvider,
        sourceChainTransaction: tx,
        destinationChainProvider
      }

      // const oldBridgeCompatibleTxObjToBeRemovedLater = {
      //   type: 'withdraw',
      //   status: 'pending',
      //   value: utils.formatUnits(amount, decimals),
      //   txID: tx.hash,
      //   assetName: symbol,
      //   assetType: AssetType.ERC20,
      //   tokenAddress,
      //   sender: address,
      //   destination: destinationAddress ?? address,
      //   l1NetworkID: destinationChainId.toString(),
      //   l2NetworkID: sourceChainId.toString()
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
