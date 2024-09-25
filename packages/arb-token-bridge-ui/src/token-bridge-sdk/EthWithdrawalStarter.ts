import { BigNumber } from 'ethers'
import { EthBridger } from '@arbitrum/sdk'
import {
  BridgeTransferStarter,
  TransferEstimateGas,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { getAddressFromSigner, percentIncrease } from './utils'
import { withdrawInitTxEstimateGas } from '../util/WithdrawalUtils'
import { isExperimentalFeatureEnabled } from '../util'

export class EthWithdrawalStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'eth_withdrawal'

  public async requiresNativeCurrencyApproval() {
    // native currency approval not required for withdrawal
    return false
  }

  public async approveNativeCurrencyEstimateGas() {
    // no-op
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
      childChainProvider: this.sourceChainProvider
    })
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    const address = await getAddressFromSigner(signer)
    const ethBridger = await EthBridger.fromProvider(this.sourceChainProvider)

    // TODO: remove this when eth-custom-dest feature is live
    // this is a safety check, this shouldn't happen
    if (
      destinationAddress &&
      !isExperimentalFeatureEnabled('eth-custom-dest')
    ) {
      throw 'Native currency withdrawals to a custom destination address are not supported yet.'
    }

    const request = await ethBridger.getWithdrawalRequest({
      amount,
      destinationAddress: destinationAddress ?? address,
      from: address
    })

    const tx = await ethBridger.withdraw({
      ...request,
      childSigner: signer,
      destinationAddress,
      overrides: {
        gasLimit: percentIncrease(
          await this.sourceChainProvider.estimateGas(request.txRequest),
          BigNumber.from(30)
        )
      }
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
