import { EthBridger } from '@arbitrum/sdk'
import {
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  TransferEstimateGas,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { getAddressFromSigner } from './utils'
import { withdrawInitTxEstimateGas } from '../util/WithdrawalUtils'
import { EthOrErc20Withdrawal } from './EthorErc20Withdrawal'

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

    return withdrawInitTxEstimateGas({
      amount,
      address,
      l2Provider: this.sourceChainProvider
    })
  }

  public async transfer({ amount, signer }: TransferProps) {
    const address = await getAddressFromSigner(signer)

    const ethBridger = await EthBridger.fromProvider(this.sourceChainProvider)
    const sourceChainTx = await ethBridger.withdraw({
      amount,
      l2Signer: signer,
      destinationAddress: address,
      from: address
    })

    return EthOrErc20Withdrawal.initializeFromSourceChainTx({
      sourceChainTx,
      sourceChainProvider: this.sourceChainProvider,
      destinationChainProvider: this.destinationChainProvider
    })
  }
}
