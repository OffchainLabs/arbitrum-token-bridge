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
  public isFetchingStatus = false

  // source chain
  public sourceChainProvider: Provider
  public sourceChainTx: ContractTransaction
  public sourceChainTxReceipt?: ContractReceipt

  // destination chain
  public destinationChainProvider: Provider
  public destinationChainTx?: ContractTransaction
  public destinationChainTxReceipt?: ContractReceipt

  abstract isPendingUserAction: boolean // if the transfer is pending user - like claim or redeem

  // claim status
  abstract requiresClaim: boolean // if the transfer requires a claim to proceed
  abstract isClaimable: boolean // is requires claim, then is the transfer claimable now?
  public abstract claim(): void // claim the transfer, as applicable

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

  /**
   *
   * Internal fetch status function that returns status but also updates internal fetching flag
   */
  private async _fetchStatus(): BridgeTransferFetchStatusFunctionResult {
    this.isFetchingStatus = true
    const status = await this.fetchStatus()
    this.isFetchingStatus = false
    return status
  }

  public pollForStatus(props: {
    intervalMs?: number
    onChange: (bridgeTransfer: BridgeTransfer) => void
  }): void {
    const intervalId = setInterval(async () => {
      console.log(`Fetching status for transfer ${this.sourceChainTx.hash}`)
      const status = await this._fetchStatus()
      const statusChanged = this.status !== status
      this.status = status

      if (statusChanged) {
        props.onChange(this)
      }

      if (this.isStatusFinal(this.status) || this.isPendingUserAction) {
        clearInterval(intervalId)
      }
    }, props.intervalMs ?? 15_000)
  }
}
