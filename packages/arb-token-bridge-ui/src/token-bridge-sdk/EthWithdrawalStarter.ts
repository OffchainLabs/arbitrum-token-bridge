import { BigNumber } from 'ethers'
import { EthBridger } from '@arbitrum/sdk'
import { Address } from 'wagmi'

import {
  BridgeTransferStarter,
  TransferEstimateGas,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { getAddressFromSigner, percentIncrease } from './utils'
import { withdrawInitTxEstimateGas } from '../util/WithdrawalUtils'

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

  public async transferEstimateGas({
    amount,
    senderAddress
  }: TransferEstimateGas) {
    return withdrawInitTxEstimateGas({
      amount,
      address: senderAddress as Address,
      childChainProvider: this.sourceChainProvider
    })
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    const address = await getAddressFromSigner(signer)
    const ethBridger = await EthBridger.fromProvider(this.sourceChainProvider)

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
