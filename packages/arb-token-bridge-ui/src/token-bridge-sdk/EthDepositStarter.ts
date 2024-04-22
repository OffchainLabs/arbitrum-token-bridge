import { EthBridger } from '@arbitrum/sdk'
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
import { getAddressFromSigner, percentIncrease } from './utils'
import { depositEthEstimateGas } from '../util/EthDepositUtils'
import { fetchErc20Allowance } from '../util/TokenUtils'

export class EthDepositStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'eth_deposit'

  public async requiresNativeCurrencyApproval({
    amount,
    signer
  }: RequiresNativeCurrencyApprovalProps) {
    const address = await getAddressFromSigner(signer)

    const ethBridger = await EthBridger.fromProvider(
      this.destinationChainProvider
    )
    const { l2Network } = ethBridger

    if (typeof l2Network.nativeToken === 'undefined') {
      return false // native currency doesn't require approval
    }

    const customFeeTokenAllowanceForInbox = await fetchErc20Allowance({
      address: l2Network.nativeToken,
      provider: this.sourceChainProvider,
      owner: address,
      spender: l2Network.ethBridge.inbox
    })

    // We want to bridge a certain amount of the custom fee token, so we have to check if the allowance is enough.
    return customFeeTokenAllowanceForInbox.lt(amount)
  }

  public async approveNativeCurrencyEstimateGas({
    signer,
    amount
  }: ApproveNativeCurrencyEstimateGasProps) {
    const ethBridger = await EthBridger.fromProvider(
      this.destinationChainProvider
    )
    const txRequest = ethBridger.getApproveGasTokenRequest({ amount })

    return signer.estimateGas(txRequest)
  }

  public async approveNativeCurrency({
    signer,
    amount
  }: ApproveNativeCurrencyProps) {
    const ethBridger = await EthBridger.fromProvider(
      this.destinationChainProvider
    )
    return ethBridger.approveGasToken({
      l1Signer: signer,
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

  public async transferEstimateGas({ amount, signer }: TransferEstimateGas) {
    const address = await getAddressFromSigner(signer)

    return depositEthEstimateGas({
      amount,
      address,
      parentChainProvider: this.sourceChainProvider,
      childChainProvider: this.destinationChainProvider
    })
  }

  public async transfer({ amount, signer }: TransferProps) {
    const address = await getAddressFromSigner(signer)

    const ethBridger = await EthBridger.fromProvider(
      this.destinationChainProvider
    )

    const depositRequest = await ethBridger.getDepositRequest({
      amount,
      from: address
    })

    const gasLimit = await this.sourceChainProvider.estimateGas(
      depositRequest.txRequest
    )

    const sourceChainTransaction = await ethBridger.deposit({
      amount,
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
