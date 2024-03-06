import { Provider } from '@ethersproject/providers'
import { ContractReceipt, ContractTransaction } from 'ethers'

type Chain = 'source_chain' | 'destination_chain'
type TxStatus = 'pending' | 'success' | 'error'

type Asset = 'erc20' | 'eth'
type TxType = 'deposit' | 'withdrawal'

export type TransferType = `${Asset}_${TxType}` | 'cctp'

export type BridgeTransferStatus = `${Chain}_tx_${TxStatus}` | 'unknown'
export type BridgeTransferFetchStatusFunctionResult =
  Promise<BridgeTransferStatus>

export type PollForStatusProps = {
  intervalMs?: number
  onChange?: (bridgeTransfer: BridgeTransfer) => void
}

export type OnStateChangeProps = {
  bridgeTransfer: BridgeTransfer
  property: string
  value: any
}

export abstract class BridgeTransfer {
  public transferType: TransferType
  public key: string // key to uniquely identify the transfer (sourceChainId_destinationChainId_sourceChainTxHash)

  // status
  public status: BridgeTransferStatus = 'unknown'
  public isFetchingStatus = false
  public lastUpdatedTimestamp: number

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

  public onStateChange: (props: OnStateChangeProps) => void

  protected constructor(props: {
    key: string
    transferType: TransferType
    status: BridgeTransferStatus
    sourceChainTx: ContractTransaction
    sourceChainTxReceipt?: ContractReceipt
    sourceChainProvider: Provider
    destinationChainProvider: Provider
  }) {
    this.key = props.key
    this.transferType = props.transferType
    this.status = props.status
    this.sourceChainTx = props.sourceChainTx
    this.sourceChainTxReceipt = props.sourceChainTxReceipt
    this.sourceChainProvider = props.sourceChainProvider
    this.destinationChainProvider = props.destinationChainProvider
    this.lastUpdatedTimestamp = Date.now()
    this.onStateChange = () => {
      // no-op
    }

    const interceptor = {
      set(obj: any, prop: string, value: any) {
        const keysToWatch: { [key: string]: boolean } = {
          status: true,
          isFetchingStatus: true,
          lastUpdatedTimestamp: true,
          sourceChainTx: true,
          sourceChainTxReceipt: true,
          destinationChainTx: true,
          destinationChainTxReceipt: true,
          isPendingUserAction: true,
          requiresClaim: true,
          isClaimable: true
        }
        if (keysToWatch[prop] && obj[prop] !== value) {
          console.log(
            `intercepting the setter for ${prop} - previous value: ${obj[prop]}, new value: ${value}`
          )
          obj.onStateChange?.({ bridgeTransfer: obj, property: prop, value })
        }
        return Reflect.set(obj, prop, value)
      }
    }
    return new Proxy(this, interceptor)
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
    this.lastUpdatedTimestamp = Date.now()
    this.isFetchingStatus = false
    return status
  }

  private intervalId: NodeJS.Timeout | undefined
  public pollForStatus(props?: PollForStatusProps): void {
    if (this.intervalId !== undefined) clearInterval(this.intervalId)

    this.intervalId = setInterval(async () => {
      if (this.isStatusFinal(this.status) || this.isPendingUserAction) {
        this.stopPollingForStatus()
      }

      console.log(`Fetching status for transfer ${this.sourceChainTx.hash}`)
      const status = await this._fetchStatus()
      const statusChanged = this.status !== status
      this.status = status

      if (statusChanged) {
        props?.onChange?.(this)
      }
    }, props?.intervalMs ?? 10_000)
  }

  public stopPollingForStatus(): void {
    console.log(
      `Stopping polling status for transfer ${this.sourceChainTx.hash}`
    )
    if (this.intervalId !== undefined) clearInterval(this.intervalId)
  }

  public watch(props: {
    onChange: (props?: OnStateChangeProps) => void
  }): void {
    this.onStateChange = props.onChange
  }
}
