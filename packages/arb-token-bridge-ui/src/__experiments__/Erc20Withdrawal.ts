import {
  BridgeTransfer,
  BridgeTransferStatus,
  BridgeTransferFetchStatusFunctionResult,
  BridgeTransferProps
} from './BridgeTransfer'
import {
  L2ToL1Message,
  L2ToL1MessageReader,
  L2TransactionReceipt
} from '@arbitrum/sdk'
import { OutgoingMessageState } from '../hooks/arbTokenBridge.types'
import { ContractReceipt, ContractTransaction, Signer } from 'ethers'
import { Provider } from '@ethersproject/providers'

export class Erc20Withdrawal extends BridgeTransfer {
  public isClaiming: boolean
  public isClaimable: boolean

  private constructor(props: BridgeTransferProps) {
    super({ ...props, type: 'erc20_withdrawal' })
    this.isClaiming = false
    this.isClaimable = false
  }

  public async updateStatus(): Promise<void> {
    this.status = await this.fetchStatus()
  }

  protected async getSourceChainTxReceipt() {
    if (!this.sourceChainTxReceipt) {
      // let's fetch it
      this.sourceChainTxReceipt =
        await this.sourceChainProvider.getTransactionReceipt(
          this.sourceChainTx.hash
        )
    }

    return this.sourceChainTxReceipt
  }

  protected async getL2ToL1Event() {
    if (!this.sourceChainTxReceipt) throw 'No tx receipt found'

    const sourceChainTxReceipt = new L2TransactionReceipt(
      this.sourceChainTxReceipt
    )
    const [event] = sourceChainTxReceipt.getL2ToL1Events()

    return event
  }

  public async fetchStatus(): BridgeTransferFetchStatusFunctionResult {
    const sourceChainTxReceipt = await this.getSourceChainTxReceipt()
    if (!sourceChainTxReceipt) {
      return 'source_chain_tx_pending'
    }

    const event = await this.getL2ToL1Event()

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

    this.isClaimable = false
    if (outgoingMessageState === OutgoingMessageState.EXECUTED) {
      return 'destination_chain_tx_success' // claiamed successfully
    }
    if (outgoingMessageState === OutgoingMessageState.CONFIRMED) {
      this.isClaimable = true
      return 'destination_chain_tx_pending' // claim pending
    }
    this.isClaimable = false
    return 'destination_chain_tx_success'
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

    return new Erc20Withdrawal({
      ...props,
      type: 'erc20_withdrawal',
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

    const erc20Withdrawal = await Erc20Withdrawal.initializeFromSourceChainTx({
      ...props,
      sourceChainTx
    })

    await erc20Withdrawal.updateStatus()

    return erc20Withdrawal
  }

  public async claim(props: {
    destinationChainSigner: Signer
    walletAddress: string
    successCallback?: (receipt: ContractReceipt) => void
    errorCallback?: () => void
  }) {
    this.isClaiming = true
    try {
      if (!this.isClaimable) throw 'Cannot claim yet'
      if (!props.walletAddress) throw 'Not connected'
      if (!props.destinationChainSigner) throw 'Not authorized to claim'
      if (!this.sourceChainTxReceipt) throw 'Outbox message not found'

      const l2ToL1Event = await this.getL2ToL1Event()

      if (!l2ToL1Event) {
        throw new Error('L2 to L1: Event not found')
      }

      const messageWriter = L2ToL1Message.fromEvent(
        props.destinationChainSigner,
        l2ToL1Event,
        this.destinationChainProvider
      )

      const res = await messageWriter.execute(this.sourceChainProvider)
      const rec = await res.wait()

      if (rec.status === 1) {
        this.status = 'destination_chain_tx_success'
        this.destinationChainTx = res
        this.destinationChainTxReceipt = rec
        // todo: set this receipt in the local storage so that it can be retrieved on refresh
        props.successCallback?.(rec)
      } else {
        this.status = 'destination_chain_tx_error'
        props.errorCallback?.()
      }
      return rec
    } catch (error: any) {
      // claim failed
      props.errorCallback?.()
    } finally {
      this.isClaiming = false
    }
  }

  public async fetchTimeRemaining() {
    return '20 mins'
  }
}
