import {
  Erc20Bridger,
  scaleFrom18DecimalsToNativeTokenDecimals
} from '@arbitrum/sdk'
import { BigNumber, constants, utils } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import {
  ApproveNativeCurrencyEstimateGasProps,
  ApproveNativeCurrencyProps,
  ApproveTokenProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresNativeCurrencyApprovalProps,
  RequiresTokenApprovalProps,
  TransferEstimateGasProps,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import {
  fetchErc20Allowance,
  fetchErc20ParentChainGatewayAddress
} from '../util/TokenUtils'
import { getAddressFromSigner, percentIncrease } from './utils'
import { depositTokenEstimateGas } from '../util/TokenDepositUtils'

// https://github.com/OffchainLabs/arbitrum-sdk/blob/main/src/lib/message/L1ToL2MessageGasEstimator.ts#L33
export const DEFAULT_GAS_PRICE_PERCENT_INCREASE = BigNumber.from(500)

export class Erc20DepositStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'erc20_deposit'

  private erc20Bridger: Erc20Bridger | undefined
  private sourceChainGatewayAddress: string | undefined

  constructor(props: BridgeTransferStarterProps) {
    super(props)

    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }
  }

  private async getBridger() {
    if (this.erc20Bridger) {
      return this.erc20Bridger
    }

    this.erc20Bridger = await Erc20Bridger.fromProvider(
      this.destinationChainProvider
    )

    return this.erc20Bridger
  }

  private async getSourceChainGatewayAddress() {
    if (this.sourceChainGatewayAddress) {
      return this.sourceChainGatewayAddress
    }

    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    this.sourceChainGatewayAddress = await fetchErc20ParentChainGatewayAddress({
      erc20ParentChainAddress: this.sourceChainErc20Address,
      parentChainProvider: this.sourceChainProvider,
      childChainProvider: this.destinationChainProvider
    })

    return this.sourceChainGatewayAddress
  }

  /**
   *
   * Erc20DepositStarter methods
   *
   */

  public async requiresNativeCurrencyApproval({
    amount,
    signer,
    options
  }: RequiresNativeCurrencyApprovalProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    const erc20Bridger = await this.getBridger()
    const l2Network = erc20Bridger.childNetwork

    if (typeof l2Network.nativeToken === 'undefined') {
      return false // native currency doesn't require approval
    }

    const nativeCurrency = ERC20__factory.connect(
      l2Network.nativeToken,
      this.sourceChainProvider
    )

    const customFeeTokenAllowanceForSourceChainGateway =
      await fetchErc20Allowance({
        address: l2Network.nativeToken,
        provider: this.sourceChainProvider,
        owner: address,
        spender: await this.getSourceChainGatewayAddress()
      })

    const gasEstimates = await this.transferEstimateGas({
      amount,
      from: await signer.getAddress()
    })

    const destinationChainGasPrice =
      await this.destinationChainProvider.getGasPrice()

    const estimatedDestinationChainGasFeeEth = parseFloat(
      utils.formatEther(
        gasEstimates.estimatedChildChainGas
          .mul(
            percentIncrease(
              destinationChainGasPrice,
              DEFAULT_GAS_PRICE_PERCENT_INCREASE
            )
          )
          .add(gasEstimates.estimatedChildChainSubmissionCost)
      )
    )

    const estimatedDestinationChainGasFee =
      scaleFrom18DecimalsToNativeTokenDecimals({
        amount: utils.parseEther(String(estimatedDestinationChainGasFeeEth)),
        decimals: await nativeCurrency.decimals()
      })

    // We want to bridge a certain amount of an ERC-20 token, but the Retryable fees on the destination chain will be paid in the custom fee token
    // We have to check if the native-token spending allowance is enough to cover the fees
    return customFeeTokenAllowanceForSourceChainGateway.lt(
      estimatedDestinationChainGasFee.add(
        options?.approvalAmountIncrease ?? BigNumber.from(0)
      )
    )
  }

  public async approveNativeCurrencyEstimateGas({
    signer,
    amount
  }: ApproveNativeCurrencyEstimateGasProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const erc20Bridger = await this.getBridger()

    const txRequest = await erc20Bridger.getApproveGasTokenRequest({
      erc20ParentAddress: this.sourceChainErc20Address,
      parentProvider: this.sourceChainProvider,
      amount
    })

    return signer.estimateGas(txRequest)
  }

  public async approveNativeCurrency({
    signer,
    amount,
    options
  }: ApproveNativeCurrencyProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const erc20Bridger = await this.getBridger()

    const l2Network = erc20Bridger.childNetwork

    if (typeof l2Network.nativeToken === 'undefined') {
      throw Error('Network does not have a custom native token')
    }

    const nativeCurrency = ERC20__factory.connect(
      l2Network.nativeToken,
      this.sourceChainProvider
    )

    const gasEstimates = await this.transferEstimateGas({
      amount,
      from: await signer.getAddress()
    })

    const destinationChainGasPrice =
      await this.destinationChainProvider.getGasPrice()

    const estimatedDestinationChainGasFeeEth = parseFloat(
      utils.formatEther(
        gasEstimates.estimatedChildChainGas
          .mul(
            percentIncrease(
              destinationChainGasPrice,
              DEFAULT_GAS_PRICE_PERCENT_INCREASE
            )
          )
          .add(gasEstimates.estimatedChildChainSubmissionCost)
      )
    )

    const estimatedDestinationChainGasFee =
      scaleFrom18DecimalsToNativeTokenDecimals({
        amount: utils.parseEther(String(estimatedDestinationChainGasFeeEth)),
        decimals: await nativeCurrency.decimals()
      })

    return erc20Bridger.approveGasToken({
      erc20ParentAddress: this.sourceChainErc20Address,
      parentSigner: signer,
      amount: estimatedDestinationChainGasFee.add(
        options?.approvalAmountIncrease ?? BigNumber.from(0)
      )
    })
  }

  public requiresTokenApproval = async ({
    amount,
    owner
  }: RequiresTokenApprovalProps) => {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const allowanceForSourceChainGateway = await fetchErc20Allowance({
      address: this.sourceChainErc20Address,
      provider: this.sourceChainProvider,
      owner,
      spender: await this.getSourceChainGatewayAddress()
    })

    return allowanceForSourceChainGateway.lt(amount)
  }

  public async approveTokenEstimateGas({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address,
      this.sourceChainProvider
    )

    return contract.estimateGas.approve(
      await this.getSourceChainGatewayAddress(),
      amount ?? constants.MaxUint256,
      {
        from: address
      }
    )
  }

  public async approveToken({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const erc20Bridger = await this.getBridger()

    return erc20Bridger.approveToken({
      erc20ParentAddress: this.sourceChainErc20Address,
      parentSigner: signer,
      amount: amount ?? constants.MaxUint256
    })
  }

  public async transferEstimateGas({ amount, from }: TransferEstimateGasProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    return depositTokenEstimateGas({
      amount,
      address: from,
      parentChainErc20Address: this.sourceChainErc20Address,
      parentChainProvider: this.sourceChainProvider,
      childChainProvider: this.destinationChainProvider
    })
  }

  public async transfer({
    amount,
    signer,
    destinationAddress,
    overrides
  }: TransferProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)
    const erc20Bridger = await this.getBridger()

    const depositRequest = await erc20Bridger.getDepositRequest({
      parentProvider: this.sourceChainProvider,
      childProvider: this.destinationChainProvider,
      from: address,
      erc20ParentAddress: this.sourceChainErc20Address,
      destinationAddress,
      amount,
      retryableGasOverrides: {
        // the gas limit may vary by about 20k due to SSTORE (zero vs nonzero)
        // the 30% gas limit increase should cover the difference
        gasLimit: { percentIncrease: BigNumber.from(30) }
      },
      ...overrides
    })

    const gasLimit = await this.sourceChainProvider.estimateGas(
      depositRequest.txRequest
    )

    const sourceChainTransaction = await erc20Bridger.deposit({
      ...depositRequest,
      parentSigner: signer,
      parentProvider: this.sourceChainProvider,
      childProvider: this.destinationChainProvider,
      overrides: { gasLimit: percentIncrease(gasLimit, BigNumber.from(5)) }
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
