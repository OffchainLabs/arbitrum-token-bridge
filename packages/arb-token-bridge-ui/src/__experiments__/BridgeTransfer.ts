import { Provider } from '@ethersproject/providers'

type Chain = 'from' | 'to'
type TxStatus = 'pending' | 'success' | 'error'

export type BridgeTransferStatus = `${Chain}_chain_tx_${TxStatus}`
export type BridgeTransferStatusFunctionProps = { toChainProvider: Provider }
export type BridgeTransferStatusFunctionResult = Promise<BridgeTransferStatus>

export abstract class BridgeTransfer {
  public abstract status(
    props: BridgeTransferStatusFunctionProps
  ): Promise<BridgeTransferStatusFunctionResult>

  public abstract getEstimatedTimeForDestinationChainTxReady(): Promise<number>

  public abstract isDestinationChainTxReady(): Promise<boolean>
}
