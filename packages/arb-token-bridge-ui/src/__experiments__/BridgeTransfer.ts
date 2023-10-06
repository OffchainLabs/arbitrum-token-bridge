import { Provider } from '@ethersproject/providers'
import { ContractReceipt, ContractTransaction } from 'ethers'

type Chain = 'source_chain' | 'destination_chain'
type TxStatus = 'pending' | 'success' | 'error'

export type BridgeTransferStatus = `${Chain}_tx_${TxStatus}`
export type BridgeTransferFetchStatusFunctionResult =
  Promise<BridgeTransferStatus>

export abstract class BridgeTransfer {
  // status
  public status: BridgeTransferStatus

  // source chain
  public sourceChainProvider: Provider
  public sourceChainTx: ContractTransaction
  public sourceChainTxReceipt?: ContractReceipt

  // destination chain
  public destinationChainProvider: Provider
  public destinationChainTx?: ContractTransaction
  public destinationChainTxReceipt?: ContractReceipt

  protected constructor(props: {
    status: BridgeTransferStatus
    sourceChainTx: ContractTransaction
    sourceChainTxReceipt?: ContractReceipt
    sourceChainProvider: Provider
    destinationChainProvider: Provider
  }) {
    this.status = props.status
    this.sourceChainTx = props.sourceChainTx
    this.sourceChainTxReceipt = props.sourceChainTxReceipt
    this.sourceChainProvider = props.sourceChainProvider
    this.destinationChainProvider = props.destinationChainProvider
  }

  /**
   * Checks if the bridge transfer status provided is final.
   *
   * @param status Status to be checked.
   */
  protected abstract isStatusFinal(status: BridgeTransferStatus): boolean

  /**
   * Fetches the current status of the bridge transfer.
   */
  public abstract fetchStatus(): BridgeTransferFetchStatusFunctionResult

  public pollForStatus(props: {
    intervalMs?: number
    onChange: (bridgeTransfer: BridgeTransfer) => void
  }): void {
    const intervalId = setInterval(async () => {
      const status = await this.fetchStatus()
      const statusChanged = this.status !== status
      this.status = status

      if (statusChanged) {
        props.onChange(this)
      }

      if (this.isStatusFinal(this.status)) {
        clearInterval(intervalId)
      }
    }, props.intervalMs ?? 15_000)
  }
}
