import {
  BridgeTransfer,
  BridgeTransferStatus,
  BridgeTransferFetchStatusFunctionResult,
  BridgeTransferProps
} from './BridgeTransfer'
import { L2ToL1MessageReader, L2TransactionReceipt } from '@arbitrum/sdk'
import { OutgoingMessageState } from '../hooks/arbTokenBridge.types'
import { ContractTransaction } from 'ethers'
import { Provider } from '@ethersproject/providers'

export class Erc20Withdrawal extends BridgeTransfer {
  private constructor(props: BridgeTransferProps) {
    super(props)
  }

  protected isStatusFinal(status: BridgeTransferStatus): boolean {
    if (status.includes('error') || status === 'destination_chain_tx_success') {
      return true
    }

    return false
  }

  public async updateStatus(): Promise<void> {
    this.status = await this.fetchStatus()
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

    const [event] = (
      this.sourceChainTxReceipt as L2TransactionReceipt
    ).getL2ToL1Events()

    if (!event) {
      return 'source_chain_tx_success' // no events found, no L2 to L1 events emitted yet
    }

    let outgoingMessageState = OutgoingMessageState.UNCONFIRMED

    const messageReader = new L2ToL1MessageReader(
      this.destinationChainProvider,
      event
    )
    try {
      outgoingMessageState = await messageReader.status(
        this.sourceChainProvider
      )
    } catch (error) {
      outgoingMessageState = OutgoingMessageState.UNCONFIRMED
    }

    if (outgoingMessageState === OutgoingMessageState.EXECUTED) {
      return 'destination_chain_tx_success' // claimed successfully
    }
    if (outgoingMessageState === OutgoingMessageState.CONFIRMED) {
      return 'destination_chain_tx_pending' // claim pending
    }

    return 'destination_chain_tx_success'
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

    return new Erc20Withdrawal({ ...props, status, sourceChainTxReceipt })
  }
}
