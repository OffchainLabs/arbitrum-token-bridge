import { EthBridger } from '@arbitrum/sdk'
import {
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  TransferEstimateGas,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { getAddressFromSigner } from './utils'
import { withdrawEthEstimateGas } from '../util/EthWithdrawalUtils'

export class EthWithdrawalStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'eth_withdrawal'

  constructor(props: BridgeTransferStarterProps) {
    super(props)
  }

  public async requiresNativeCurrencyApproval() {
    // native currency approval not required for withdrawal
    return false
  }

  public async approveNativeCurrency() {
    // no-op
  }

  public requiresTokenApproval = async () => false

  public approveTokenEstimateGas = async () => {
    // no-op
  }

  public approveToken = async () => {
    // no-op
  }

  public async transferEstimateGas({ amount, signer }: TransferEstimateGas) {
    const address = (await getAddressFromSigner(signer)) as `0x${string}`

    return withdrawEthEstimateGas({
      amount,
      address,
      l2Provider: this.sourceChainProvider
    })
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
