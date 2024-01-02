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
import { getAddressFromSigner } from './utils'

export class EthWithdrawalStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'eth_withdrawal'

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

    const ethBridger = await EthBridger.fromProvider(this.sourceChainProvider)
    const tx = await ethBridger.withdraw({
      amount,
      l2Signer: signer,
      destinationAddress: address,
      from: address
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
