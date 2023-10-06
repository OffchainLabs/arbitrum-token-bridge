import { ContractTransaction, ContractReceipt } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { L1ContractCallTransactionReceipt } from '@arbitrum/sdk/dist/lib/message/L1Transaction'

import {
  BridgeTransfer,
  BridgeTransferStatus,
  BridgeTransferFetchStatusFunctionResult
} from './BridgeTransfer'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'

export class Erc20Deposit extends BridgeTransfer {
  private constructor(props: {
    status: BridgeTransferStatus
    sourceChainTx: ContractTransaction
    sourceChainTxReceipt?: ContractReceipt
    sourceChainProvider: Provider
    destinationChainProvider: Provider
  }) {
    super(props)
  }

  public static async fromSourceChainTx(props: {
    sourceChainTx: ContractTransaction
    sourceChainProvider: Provider
    destinationChainProvider: Provider
  }) {
    const sourceChainTxReceipt =
      await props.sourceChainProvider.getTransactionReceipt(
        props.sourceChainTx.hash
      )

    let status: BridgeTransferStatus

    if (sourceChainTxReceipt) {
      status =
        sourceChainTxReceipt.status === 0
          ? 'source_chain_tx_error'
          : 'source_chain_tx_success'
    } else {
      status = 'source_chain_tx_pending'
    }

    return new Erc20Deposit({ ...props, status, sourceChainTxReceipt })
  }

  protected isStatusFinal(status: BridgeTransferStatus): boolean {
    if (status === 'source_chain_tx_error') {
      return true
    }

    return false
  }

  public async fetchStatus(): BridgeTransferFetchStatusFunctionResult {
    // we don't have a source chain tx receipt yet
    if (!this.sourceChainTxReceipt) {
      // let's fetch it
      this.sourceChainTxReceipt =
        await this.sourceChainProvider.getTransactionReceipt(
          this.sourceChainTx.hash
        )

      // still nothing
      if (!this.sourceChainTxReceipt) {
        return 'source_chain_tx_pending'
      }
    }

    // okay now we have tx receipt
    const [message] = await new L1ContractCallTransactionReceipt(
      this.sourceChainTxReceipt
    ).getL1ToL2Messages(this.destinationChainProvider)

    // message not yet created
    if (typeof message === 'undefined') {
      return this.sourceChainTxReceipt.status === 1
        ? 'source_chain_tx_success'
        : 'source_chain_tx_error'
    }

    return this.mapStatus(await message.status())
  }

  private mapStatus(status: L1ToL2MessageStatus): BridgeTransferStatus {
    switch (status) {
      case L1ToL2MessageStatus.NOT_YET_CREATED:
        return 'source_chain_tx_success'

      case L1ToL2MessageStatus.REDEEMED:
        return 'destination_chain_tx_success'

      default:
        return 'destination_chain_tx_pending'
    }
  }
}
