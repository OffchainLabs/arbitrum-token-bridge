import { EthBridger, getArbitrumNetwork } from '@arbitrum/sdk'
import { BigNumber } from 'ethers'
import {
  ApproveNativeCurrencyEstimateGasProps,
  ApproveNativeCurrencyProps,
  BridgeTransferStarter,
  RequiresNativeCurrencyApprovalProps,
  TransferEstimateGas,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import {
  getAddressFromSigner,
  getChainIdFromProvider,
  percentIncrease,
  validateSignerChainId
} from './utils'
import { depositEthEstimateGas } from '../util/EthDepositUtils'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { isExperimentalFeatureEnabled } from '../util'
import { isCustomDestinationAddressTx } from '../state/app/utils'

export class EthDepositStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'eth_deposit'

  private ethBridger: EthBridger | undefined

  private async getBridger(): Promise<EthBridger> {
    if (this.ethBridger) {
      return this.ethBridger
    }

    this.ethBridger = await EthBridger.fromProvider(
      this.destinationChainProvider
    )

    return this.ethBridger
  }

  public async requiresNativeCurrencyApproval({
    amount,
    signer
  }: RequiresNativeCurrencyApprovalProps) {
    const address = await getAddressFromSigner(signer)
    const ethBridger = await this.getBridger()

    const { childNetwork } = ethBridger

    if (typeof childNetwork.nativeToken === 'undefined') {
      return false // native currency doesn't require approval
    }

    const customFeeTokenAllowanceForInbox = await fetchErc20Allowance({
      address: childNetwork.nativeToken,
      provider: this.sourceChainProvider,
      owner: address,
      spender: childNetwork.ethBridge.inbox
    })

    // We want to bridge a certain amount of the custom fee token, so we have to check if the allowance is enough.
    return customFeeTokenAllowanceForInbox.lt(amount)
  }

  public async approveNativeCurrencyEstimateGas({
    signer,
    amount
  }: ApproveNativeCurrencyEstimateGasProps) {
    const ethBridger = await this.getBridger()
    const txRequest = ethBridger.getApproveGasTokenRequest({ amount })

    return signer.estimateGas(txRequest)
  }

  public async approveNativeCurrency({
    signer,
    amount
  }: ApproveNativeCurrencyProps) {
    const ethBridger = await this.getBridger()
    return ethBridger.approveGasToken({
      parentSigner: signer,
      amount
    })
  }

  public requiresTokenApproval = async () => false

  public approveTokenEstimateGas = async () => {
    // no-op
  }

  public approveToken = async () => {
    // no-op
  }

  public async transferEstimateGas({
    amount,
    signer,
    destinationAddress
  }: TransferEstimateGas) {
    const address = await getAddressFromSigner(signer)

    return depositEthEstimateGas({
      amount,
      address,
      parentChainProvider: this.sourceChainProvider,
      childChainProvider: this.destinationChainProvider,
      destinationAddress
    })
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    const address = await getAddressFromSigner(signer)
    const ethBridger = await this.getBridger()
    const destinationChainId = (
      await this.destinationChainProvider.getNetwork()
    ).chainId

    const isDifferentDestinationAddress = isCustomDestinationAddressTx({
      sender: address,
      destination: destinationAddress
    })

    // TODO: remove this when eth-custom-dest feature is live
    // this is a safety check, this shouldn't happen
    if (
      isDifferentDestinationAddress &&
      !isExperimentalFeatureEnabled('eth-custom-dest')
    ) {
      throw new Error(
        'Native currency transfers to a custom destination address are not supported yet.'
      )
    }

    await validateSignerChainId({
      signer,
      sourceChainIdOrProvider: this.sourceChainProvider
    })

    const depositRequest = isDifferentDestinationAddress
      ? await ethBridger.getDepositToRequest({
          amount,
          from: address,
          parentProvider: this.sourceChainProvider,
          childProvider: this.destinationChainProvider,
          // we know it's defined
          destinationAddress: String(destinationAddress)
        })
      : await ethBridger.getDepositRequest({
          amount,
          from: address
        })

    const depositToAddress = depositRequest.txRequest.to.toLowerCase()

    const inboxAddressForChain =
      getArbitrumNetwork(destinationChainId).ethBridge.inbox.toLowerCase()

    if (depositToAddress !== inboxAddressForChain) {
      throw new Error(
        `Wrong inbox address for destination chain. Expected ${inboxAddressForChain}, got ${depositToAddress} instead.`
      )
    }

    const gasLimit = await this.sourceChainProvider.estimateGas(
      depositRequest.txRequest
    )

    const parentChainOverrides = {
      gasLimit: percentIncrease(gasLimit, BigNumber.from(5))
    }

    const sourceChainTransaction = isDifferentDestinationAddress
      ? await ethBridger.depositTo({
          amount,
          parentSigner: signer,
          childProvider: this.destinationChainProvider,
          destinationAddress: String(destinationAddress),
          overrides: parentChainOverrides,
          retryableGasOverrides: {
            // the gas limit may vary by about 20k due to SSTORE (zero vs nonzero)
            // the 30% gas limit increase should cover the difference
            gasLimit: { percentIncrease: BigNumber.from(30) }
          }
        })
      : await ethBridger.deposit({
          amount,
          parentSigner: signer,
          overrides: parentChainOverrides
        })

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction,
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
