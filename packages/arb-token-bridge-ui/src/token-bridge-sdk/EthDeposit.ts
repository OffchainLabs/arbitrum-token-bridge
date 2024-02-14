import { ContractTransaction, ContractReceipt } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { L1ContractCallTransactionReceipt } from '@arbitrum/sdk/dist/lib/message/L1Transaction'

import {
  BridgeTransfer,
  BridgeTransferStatus,
  BridgeTransferFetchStatusFunctionResult
} from './BridgeTransfer'
import {
  EthDepositStatus,
  L1ToL2MessageReaderClassic,
  L1ToL2MessageStatus
} from '@arbitrum/sdk'
import { EthDepositMessage } from '@arbitrum/sdk/dist/lib/message/L1ToL2Message'

export class EthDeposit extends BridgeTransfer {
  public requiresClaim = false
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

    return new EthDeposit({ ...props, status, sourceChainTxReceipt })
  }

  public static async initializeFromSourceChainTxHash(props: {
    sourceChainTxHash: string
    sourceChainProvider: Provider
    destinationChainProvider: Provider
  }) {
    const sourceChainTx = await props.sourceChainProvider.getTransaction(
      props.sourceChainTxHash
    )

    const ethDeposit = await EthDeposit.initializeFromSourceChainTx({
      ...props,
      sourceChainTx
    })

    await ethDeposit.updateStatus()

    return ethDeposit
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

    const sourceChainTxReceipt = new L1ContractCallTransactionReceipt(
      this.sourceChainTxReceipt
    )

    // okay now we have tx receipt
    const isClassic = await sourceChainTxReceipt.isClassic(
      this.destinationChainProvider
    )

    const [message] = isClassic
      ? await sourceChainTxReceipt.getL1ToL2MessagesClassic(
          this.destinationChainProvider
        )
      : await sourceChainTxReceipt.getEthDeposits(this.destinationChainProvider)

    // message not yet created
    if (typeof message === 'undefined') {
      return sourceChainTxReceipt.status === 1
        ? 'source_chain_tx_success'
        : 'source_chain_tx_error'
    }

    const status = await message.status()

    if (isClassic) {
      const isFailure =
        status === L1ToL2MessageStatus.CREATION_FAILED ||
        L1ToL2MessageStatus.EXPIRED ||
        L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2 // manual redemption required
      if (isFailure) return 'destination_chain_tx_error'

      const isDeposited = status === L1ToL2MessageStatus.REDEEMED
      if (isDeposited) {
        this.destinationChainTxReceipt =
          await this.destinationChainProvider.getTransactionReceipt(
            (message as L1ToL2MessageReaderClassic).l2TxHash
          )

        return 'destination_chain_tx_success'
      }
    } else {
      // non classic
      const isFailure = !(
        status === EthDepositStatus.PENDING ||
        status === EthDepositStatus.DEPOSITED
      )
      if (isFailure) return 'destination_chain_tx_error'

      const isDeposited = status === EthDepositStatus.DEPOSITED
      if (isDeposited) {
        this.destinationChainTxReceipt =
          await this.destinationChainProvider.getTransactionReceipt(
            (message as EthDepositMessage).l2DepositTxHash
          )
        return 'destination_chain_tx_success'
      }
    }

    return 'destination_chain_tx_pending'
  }

  public async claim(): Promise<void> {
    //no-op
  }
}
