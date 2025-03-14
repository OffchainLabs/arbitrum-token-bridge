import {
  EthBridger,
  getArbitrumNetwork,
  scaleFrom18DecimalsToNativeTokenDecimals
} from '@arbitrum/sdk'
import { BigNumber, Signer } from 'ethers'
import {
  ApproveNativeCurrencyEstimateGasProps,
  ApproveNativeCurrencyProps,
  BridgeTransferStarter,
  RequiresNativeCurrencyApprovalProps,
  TransferEstimateGasProps,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import {
  getAddressFromSigner,
  percentIncrease,
  validateSignerChainId
} from './utils'
import { depositEthEstimateGas } from '../util/EthDepositUtils'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { addressIsSmartContract } from '../util/AddressUtils'
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
    amount,
    destinationAddress
  }: {
    signer: Signer
    amount: BigNumber
    destinationAddress?: string
  }) {
    const isCustomDestinationAddress = !!destinationAddress

    if (!isCustomDestinationAddress) {
      return BigNumber.from(0)
    }

    const nativeTokenDecimals = (
      await fetchNativeCurrency({ provider: this.destinationChainProvider })
    ).decimals

    // Eth transfers to a custom destination use retryables
    // In the case of native currency we need to also approve native currency used for gas
    const gasEstimates = await this.transferEstimateGas({
      amount,
      signer,
      destinationAddress
    })

    const gasPrice = percentIncrease(
      await this.destinationChainProvider.getGasPrice(),
      BigNumber.from(DEFAULT_GAS_PRICE_PERCENT_INCREASE)
    )

    return scaleFrom18DecimalsToNativeTokenDecimals({
      amount: gasEstimates.estimatedChildChainGas
        .mul(gasPrice)
        .add(gasEstimates.estimatedChildChainSubmissionCost),
      decimals: nativeTokenDecimals
    })
  }

  public async requiresNativeCurrencyApproval({
    amount,
    signer,
    destinationAddress
  }: RequiresNativeCurrencyApprovalProps) {
    const address = await getAddressFromSigner(signer)
    const ethBridger = await this.getBridger()

    const { childNetwork } = ethBridger

    if (typeof childNetwork.nativeToken === 'undefined') {
      return false // native currency doesn't require approval
    }

    const retryableFees = await this.getDepositRetryableFees({
      signer,
      amount,
      destinationAddress
    })

    const customFeeTokenAllowanceForInbox = await fetchErc20Allowance({
      address: childNetwork.nativeToken,
      provider: this.sourceChainProvider,
      owner: address,
      spender: childNetwork.ethBridge.inbox
    })

    // We want to bridge a certain amount of the custom fee token, so we have to check if the allowance is enough.
    return customFeeTokenAllowanceForInbox.lt(amount.add(retryableFees))
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
    amount,
    destinationAddress
  }: ApproveNativeCurrencyProps) {
    const ethBridger = await this.getBridger()

    const retryableFees = await this.getDepositRetryableFees({
      signer,
      amount,
      destinationAddress
    })

    return ethBridger.approveGasToken({
      parentSigner: signer,
      amount: amount.add(retryableFees)
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
  }: TransferEstimateGasProps) {
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

    const isCustomDestinationAddress = !!destinationAddress

    await validateSignerChainId({
      signer,
      sourceChainIdOrProvider: this.sourceChainProvider
    })

    const depositRequest = isCustomDestinationAddress
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

    if (!addressIsSmartContract(depositToAddress, this.sourceChainProvider)) {
      throw new Error(`Inbox address provided is not a smart contract address.`)
    }

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

    const sourceChainTransaction = isCustomDestinationAddress
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
