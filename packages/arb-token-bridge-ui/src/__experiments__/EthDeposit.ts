import { Provider } from '@ethersproject/providers'
import { L1EthDepositTransactionReceipt } from '@arbitrum/sdk/dist/lib/message/L1Transaction'

import {
  BridgeTransfer,
  BridgeTransferFetchStatusFunctionResult,
  BridgeTransferPollStatusProps,
  BridgeTransferStatus
} from './BridgeTransfer'
import { ContractTransaction } from 'ethers'

export class EthDeposit extends BridgeTransfer {
  public sourceChainProvider: Provider
  public sourceChainTxReceipt: L1EthDepositTransactionReceipt

  private constructor(props: {
    status: BridgeTransferStatus
    sourceChainTx: ContractTransaction
    sourceChainTxReceipt?: L1EthDepositTransactionReceipt
    sourceChainProvider: Provider
    destinationChainProvider: Provider
  }) {
    super(props)

    this.sourceChainProvider = props.sourceChainProvider
  }

  public static async create(props: {
    fromChainProvider: Provider
    fromChainTxHash: string
  }) {
    const txReceipt = await props.fromChainProvider.getTransactionReceipt(
      props.fromChainTxHash
    )

    return new EthDeposit({
      sourceChainProvider: props.fromChainProvider,
      sourceChainTxReceipt: txReceipt as L1EthDepositTransactionReceipt
    })
  }

  public async fetchStatus(): BridgeTransferFetchStatusFunctionResult {
    const [message] = await this.sourceChainTxReceipt.getEthDeposits(
      this.destinationChainProvider
    )

    // not yet created
    if (typeof message === 'undefined') {
      return 'source_chain_tx_success'
    }

    return 'destination_chain_tx_success'
  }

  public async pollForStatus(props: BridgeTransferPollStatusProps) {
    const intervalId = setInterval(async () => {
      const status = await this.fetchStatus()

      if (status === 'destination_chain_tx_success') {
        clearInterval(intervalId)
      }

      return status
    }, props?.intervalMs ?? 10_000)
  }

  public isStatusFinal() {}
}
