import { EthBridger } from '@arbitrum/sdk'
import {
  ApproveNativeCurrencyProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresNativeCurrencyApprovalProps,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { requiresNativeCurrencyApproval } from './requiresNativeCurrencyApproval'
import { approveNativeCurrency } from './approveNativeCurrency'
import { getAddressFromSigner, percentIncrease } from './utils'
import { BigNumber } from 'ethers'

export class EthDepositStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'eth_deposit'

  constructor(props: BridgeTransferStarterProps) {
    super(props)
  }

  public async requiresNativeCurrencyApproval({
    amount,
    signer
  }: RequiresNativeCurrencyApprovalProps) {
    return requiresNativeCurrencyApproval({
      amount,
      signer,
      destinationChainProvider: this.destinationChainProvider
    })
  }

  public async approveNativeCurrency({ signer }: ApproveNativeCurrencyProps) {
    return approveNativeCurrency({
      signer,
      destinationChainProvider: this.destinationChainProvider
    })
  }

  public requiresTokenApproval = async () => false

  public approveTokenEstimateGas = async () => {
    // no-op
  }

  public approveToken = async () => {
    // no-op
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

    const tx = await ethBridger.deposit({
      amount,
      l1Signer: signer,
      overrides: { gasLimit: percentIncrease(gasLimit, BigNumber.from(5)) }
    })

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: tx,
      destinationChainProvider: this.destinationChainProvider
    }
  }
}
