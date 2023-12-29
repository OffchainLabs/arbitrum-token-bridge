import dayjs from 'dayjs'

import { ContractTransaction } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { L1ContractCallTransactionReceipt } from '@arbitrum/sdk/dist/lib/message/L1Transaction'

import {
  BridgeTransfer,
  BridgeTransferStatus,
  BridgeTransferFetchStatusFunctionResult,
  BridgeTransferProps
} from './BridgeTransfer'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'
import {
  getEstimatedDepositDurationInMinutes,
  getMinutesRemainingText
} from './Erc20DepositTimeRemainingUtils'

export class Erc20Deposit extends BridgeTransfer {
  public isUserActionRequired: boolean

  private constructor(props: BridgeTransferProps) {
    super({ ...props, type: 'erc20_deposit' })
    this.isUserActionRequired = false
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

    return new Erc20Deposit({
      ...props,
      type: 'erc20_deposit',
      status,
      sourceChainTxReceipt
    })
  }

  public static async initializeFromSourceChainTxHash(props: {
    sourceChainTxHash: string
    sourceChainProvider: Provider
    destinationChainProvider: Provider
  }) {
    const sourceChainTx = await props.sourceChainProvider.getTransaction(
      props.sourceChainTxHash
    )

    const erc20Deposit = await Erc20Deposit.initializeFromSourceChainTx({
      ...props,
      sourceChainTx
    })

    await erc20Deposit.updateStatus()

    return erc20Deposit
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

    const successfulRedeem = await message.getSuccessfulRedeem()

    if (successfulRedeem.status === L1ToL2MessageStatus.REDEEMED) {
      this.destinationChainTxReceipt = successfulRedeem.l2TxReceipt
      return 'destination_chain_tx_success'
    }

    if (successfulRedeem.status === L1ToL2MessageStatus.NOT_YET_CREATED) {
      return 'source_chain_tx_success'
    }

    return 'destination_chain_tx_error'
  }

  public async fetchTimeRemaining() {
    const now = dayjs()
    const createdAt = this.sourceChainTx.timestamp
    const whenCreated = dayjs(createdAt)

    const sourceChainId = await (
      await this.sourceChainProvider.getNetwork()
    ).chainId

    if (!this.isStatusFinal(this.status)) {
      // Subtract the diff from the initial deposit time
      const minutesRemaining =
        getEstimatedDepositDurationInMinutes(sourceChainId) -
        now.diff(whenCreated, 'minutes')
      return getMinutesRemainingText(minutesRemaining)
    } else {
      return 'Completed'
    }
  }
}
