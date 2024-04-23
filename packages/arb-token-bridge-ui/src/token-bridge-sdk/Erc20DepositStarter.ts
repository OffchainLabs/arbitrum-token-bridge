import { Erc20Bridger } from '@arbitrum/sdk'
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
  TransferEstimateGas,
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

  constructor(props: BridgeTransferStarterProps) {
    super(props)

    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }
  }

  public async requiresNativeCurrencyApproval({
    amount,
    signer
  }: RequiresNativeCurrencyApprovalProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    const erc20Bridger = await Erc20Bridger.fromProvider(
      this.destinationChainProvider
    )
    const l2Network = erc20Bridger.l2Network

    if (typeof l2Network.nativeToken === 'undefined') {
      return false // native currency doesn't require approval
    }

    const nativeCurrency = ERC20__factory.connect(
      l2Network.nativeToken,
      this.sourceChainProvider
    )

    const parentChainGatewayAddress = await fetchErc20ParentChainGatewayAddress(
      {
        erc20ParentChainAddress: this.sourceChainErc20Address,
        parentChainProvider: this.sourceChainProvider,
        childChainProvider: this.destinationChainProvider
      }
    )

    const customFeeTokenAllowanceForL1Gateway = await fetchErc20Allowance({
      address: l2Network.nativeToken,
      provider: this.sourceChainProvider,
      owner: address,
      spender: parentChainGatewayAddress
    })

    const gasEstimates = await this.transferEstimateGas({ amount, signer })
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
    const estimatedDestinationChainGasFee = utils.parseUnits(
      String(estimatedDestinationChainGasFeeEth),
      await nativeCurrency.decimals()
    )

    // We want to bridge a certain amount of an ERC-20 token, but the Retryable fees on the destination chain will be paid in the custom fee token
    // We have to check if the native-token spending allowance is enough to cover the fees
    return customFeeTokenAllowanceForL1Gateway.lt(
      estimatedDestinationChainGasFee
    )
  }

  public async approveNativeCurrencyEstimateGas({
    signer,
    amount
  }: ApproveNativeCurrencyEstimateGasProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const erc20Bridger = await Erc20Bridger.fromProvider(
      this.destinationChainProvider
    )

    const txRequest = await erc20Bridger.getApproveGasTokenRequest({
      erc20L1Address: this.sourceChainErc20Address,
      l1Provider: this.sourceChainProvider,
      amount
    })

    return signer.estimateGas(txRequest)
  }

  public async approveNativeCurrency({
    signer,
    amount
  }: ApproveNativeCurrencyProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const erc20Bridger = await Erc20Bridger.fromProvider(
      this.destinationChainProvider
    )

    const l2Network = erc20Bridger.l2Network

    if (typeof l2Network.nativeToken === 'undefined') {
      throw Error('Network does not have a custom native token')
    }

    const nativeCurrency = ERC20__factory.connect(
      l2Network.nativeToken,
      this.sourceChainProvider
    )

    const gasEstimates = await this.transferEstimateGas({ amount, signer })
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

    const estimatedDestinationChainGasFee = utils.parseUnits(
      String(estimatedDestinationChainGasFeeEth),
      await nativeCurrency.decimals()
    )

    return erc20Bridger.approveGasToken({
      erc20L1Address: this.sourceChainErc20Address,
      l1Signer: signer,
      amount: estimatedDestinationChainGasFee
    })
  }

  public requiresTokenApproval = async ({
    amount,
    signer
  }: RequiresTokenApprovalProps) => {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    const parentChainGatewayAddress = await fetchErc20ParentChainGatewayAddress(
      {
        erc20ParentChainAddress: this.sourceChainErc20Address,
        parentChainProvider: this.sourceChainProvider,
        childChainProvider: this.destinationChainProvider
      }
    )

    const allowanceForParentChainGateway = await fetchErc20Allowance({
      address: this.sourceChainErc20Address,
      provider: this.sourceChainProvider,
      owner: address,
      spender: parentChainGatewayAddress
    })

    return allowanceForParentChainGateway.lt(amount)
  }

  public async approveTokenEstimateGas({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    const parentChainGatewayAddress = await fetchErc20ParentChainGatewayAddress(
      {
        erc20ParentChainAddress: this.sourceChainErc20Address,
        parentChainProvider: this.sourceChainProvider,
        childChainProvider: this.destinationChainProvider
      }
    )

    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address,
      this.sourceChainProvider
    )

    return contract.estimateGas.approve(
      parentChainGatewayAddress,
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

    const erc20Bridger = await Erc20Bridger.fromProvider(
      this.destinationChainProvider
    )
    return erc20Bridger.approveToken({
      erc20L1Address: this.sourceChainErc20Address,
      l1Signer: signer,
      amount: amount ?? constants.MaxUint256
    })
  }

  public async transferEstimateGas({ amount, signer }: TransferEstimateGas) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    return depositTokenEstimateGas({
      amount,
      address,
      erc20L1Address: this.sourceChainErc20Address,
      parentChainProvider: this.sourceChainProvider,
      childChainProvider: this.destinationChainProvider
    })
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)

    const tokenAddress = this.sourceChainErc20Address

    const erc20Bridger = await Erc20Bridger.fromProvider(
      this.destinationChainProvider
    )

    const depositRequest = await erc20Bridger.getDepositRequest({
      l1Provider: this.sourceChainProvider,
      l2Provider: this.destinationChainProvider,
      from: address,
      erc20L1Address: tokenAddress,
      destinationAddress,
      amount,
      retryableGasOverrides: {
        // the gas limit may vary by about 20k due to SSTORE (zero vs nonzero)
        // the 30% gas limit increase should cover the difference
        gasLimit: { percentIncrease: BigNumber.from(30) }
      }
    })

    const gasLimit = await this.sourceChainProvider.estimateGas(
      depositRequest.txRequest
    )

    const sourceChainTransaction = await erc20Bridger.deposit({
      ...depositRequest,
      l1Signer: signer,
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
