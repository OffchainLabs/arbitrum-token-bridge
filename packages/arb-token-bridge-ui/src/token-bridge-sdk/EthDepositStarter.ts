import {
  EthBridger,
  scaleFrom18DecimalsToNativeTokenDecimals
} from '@arbitrum/sdk'
import { BigNumber, Signer } from 'ethers'
import {
  ApproveNativeCurrencyEstimateGasProps,
  ApproveNativeCurrencyProps,
  BridgeTransferStarter,
  RequiresNativeCurrencyApprovalProps,
  TransferEstimateGas,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { getAddressFromSigner, percentIncrease } from './utils'
import { depositEthEstimateGas } from '../util/EthDepositUtils'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { isExperimentalFeatureEnabled } from '../util'
import { isCustomDestinationAddressTx } from '../state/app/utils'
import { DEFAULT_GAS_PRICE_PERCENT_INCREASE } from './Erc20DepositStarter'
import { fetchNativeCurrency } from '../hooks/useNativeCurrency'

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

  private async getDepositRetryableFees({
    signer,
    amount
  }: {
    signer: Signer
    amount: BigNumber
  }) {
    const address = await getAddressFromSigner(signer)

    const isDifferentDestinationAddress = isCustomDestinationAddressTx({
      sender: address,
      destination: this.destinationAddress
    })

    if (!isDifferentDestinationAddress) {
      return BigNumber.from(0)
    }

    // Eth transfers to a custom destination use retryables
    // In the case of native currency we need to also approve native currency used for gas
    const retryableGasEstimates = await this.transferEstimateGas({
      amount,
      signer
    })

    const gasPrice = percentIncrease(
      await this.destinationChainProvider.getGasPrice(),
      BigNumber.from(DEFAULT_GAS_PRICE_PERCENT_INCREASE)
    )

    return retryableGasEstimates.estimatedChildChainGas
      .mul(gasPrice)
      .add(retryableGasEstimates.estimatedChildChainSubmissionCost)
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

    const nativeTokenDecimals = (
      await fetchNativeCurrency({ provider: this.destinationChainProvider })
    ).decimals

    const parentRetryableGas = scaleFrom18DecimalsToNativeTokenDecimals({
      amount: await this.getDepositRetryableFees({
        signer,
        amount
      }),
      decimals: nativeTokenDecimals
    })

    const customFeeTokenAllowanceForInbox = await fetchErc20Allowance({
      address: childNetwork.nativeToken,
      provider: this.sourceChainProvider,
      owner: address,
      spender: childNetwork.ethBridge.inbox
    })

    // We want to bridge a certain amount of the custom fee token, so we have to check if the allowance is enough.
    return customFeeTokenAllowanceForInbox.lt(amount.add(parentRetryableGas))
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

    const parentRetryableGas = await this.getDepositRetryableFees({
      signer,
      amount
    })

    return ethBridger.approveGasToken({
      parentSigner: signer,
      amount: amount.add(parentRetryableGas)
    })
  }

  public requiresTokenApproval = async () => false

  public approveTokenEstimateGas = async () => {
    // no-op
  }

  public approveToken = async () => {
    // no-op
  }

  public async transferEstimateGas({ amount, signer }: TransferEstimateGas) {
    const address = await getAddressFromSigner(signer)

    return depositEthEstimateGas({
      amount,
      address,
      parentChainProvider: this.sourceChainProvider,
      childChainProvider: this.destinationChainProvider,
      destinationAddress: this.destinationAddress
    })
  }

  public async transfer({ amount, signer }: TransferProps) {
    const address = await getAddressFromSigner(signer)
    const ethBridger = await this.getBridger()

    const isDifferentDestinationAddress = isCustomDestinationAddressTx({
      sender: address,
      destination: this.destinationAddress
    })

    // TODO: remove this when eth-custom-dest feature is live
    // this is a safety check, this shouldn't happen
    if (
      isDifferentDestinationAddress &&
      !isExperimentalFeatureEnabled('eth-custom-dest')
    ) {
      throw 'Native currency transfers to a custom destination address are not supported yet.'
    }

    const depositRequest = isDifferentDestinationAddress
      ? await ethBridger.getDepositToRequest({
          amount,
          from: address,
          parentProvider: this.sourceChainProvider,
          childProvider: this.destinationChainProvider,
          // we know it's defined
          destinationAddress: String(this.destinationAddress)
        })
      : await ethBridger.getDepositRequest({
          amount,
          from: address
        })

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
          destinationAddress: String(this.destinationAddress),
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
