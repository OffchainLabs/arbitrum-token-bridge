import { EthBridger } from '@arbitrum/sdk'
import { BigNumber } from 'ethers'
import {
  ApproveNativeCurrencyProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresNativeCurrencyApprovalProps,
  TransferEstimateGas,
  TransferProps
} from './BridgeTransferStarter'
import { getAddressFromSigner, percentIncrease } from './utils'
import { depositEthEstimateGas } from '../util/EthDepositUtils'
import { fetchErc20Allowance } from '../util/TokenUtils'
import { EthDeposit } from './EthDeposit'
import { TransferType } from './BridgeTransfer'

export class EthDepositStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'eth_deposit'

  constructor(props: BridgeTransferStarterProps) {
    super(props)
  }

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
      return false // no native currency found for the network
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

  public async approveNativeCurrency({ signer }: ApproveNativeCurrencyProps) {
    const ethBridger = await EthBridger.fromProvider(
      this.destinationChainProvider
    )
    const approveCustomFeeTokenTx = await ethBridger.approveGasToken({
      l1Signer: signer
    })
    await approveCustomFeeTokenTx.wait()
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
      l1Provider: this.sourceChainProvider,
      l2Provider: this.destinationChainProvider
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

    const sourceChainTx = await ethBridger.deposit({
      amount,
      l1Signer: signer,
      overrides: { gasLimit: percentIncrease(gasLimit, BigNumber.from(5)) }
    })

    return EthDeposit.initializeFromSourceChainTx({
      sourceChainTx,
      sourceChainProvider: this.sourceChainProvider,
      destinationChainProvider: this.destinationChainProvider
    })
  }
}
