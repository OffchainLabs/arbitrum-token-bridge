import { ContractTransaction, ContractReceipt } from 'ethers'
import { Provider } from '@ethersproject/providers'

import {
  BridgeTransfer,
  BridgeTransferStatus,
  BridgeTransferFetchStatusFunctionResult
} from './BridgeTransfer'
import { L2ToL1MessageReader, L2TransactionReceipt } from '@arbitrum/sdk'
import { OutgoingMessageState } from '../hooks/arbTokenBridge.types'

export class EthOrErc20Withdrawal extends BridgeTransfer {
  public requiresClaim = true
  public isClaimable = false
  public isPendingUserAction = false

  private constructor(props: {
    status: BridgeTransferStatus
    sourceChainTx: ContractTransaction
    sourceChainTxReceipt?: ContractReceipt
    sourceChainProvider: Provider
    destinationChainProvider: Provider
  }) {
    super(props)
  }

  public static async initializeFromSourceChainTx(props: {
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

    return new EthOrErc20Withdrawal({ ...props, status, sourceChainTxReceipt })
  }

  public static async initializeFromSourceChainTxHash(props: {
    sourceChainTxHash: string
    sourceChainProvider: Provider
    destinationChainProvider: Provider
  }) {
    const sourceChainTx = await props.sourceChainProvider.getTransaction(
      props.sourceChainTxHash
    )

    const ethOrErc20Withdrawal =
      await EthOrErc20Withdrawal.initializeFromSourceChainTx({
        ...props,
        sourceChainTx
      })

    await ethOrErc20Withdrawal.updateStatus()

    return ethOrErc20Withdrawal
  }

  protected isStatusFinal(status: BridgeTransferStatus): boolean {
    if (
      status === 'source_chain_tx_error' ||
      status === 'destination_chain_tx_success'
    ) {
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

    const [event] = new L2TransactionReceipt(
      this.sourceChainTxReceipt
    ).getL2ToL1Events()

    // no event found, even if receipt was found
    if (!event) return 'source_chain_tx_error'

    const messageReader = new L2ToL1MessageReader(
      this.destinationChainProvider,
      event
    )
    let messageStatus = OutgoingMessageState.UNCONFIRMED
    try {
      messageStatus = await messageReader.status(this.sourceChainProvider)
    } catch (error) {
      // no-op
    }
    if (messageStatus === OutgoingMessageState.EXECUTED) {
      this.isClaimable = false
      return 'destination_chain_tx_success'
    } else if (messageStatus === OutgoingMessageState.CONFIRMED) {
      this.isClaimable = true
      this.isPendingUserAction = true
    }
    return 'destination_chain_tx_pending'
  }

  public async claim(): Promise<void> {
    if (!this.isClaimable) {
      throw new Error('Cannot claim transfer')
    }
  }
}
