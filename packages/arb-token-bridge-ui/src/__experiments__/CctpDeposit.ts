// todo;

import {
  BridgeTransfer,
  BridgeTransferFetchStatusFunctionResult,
  BridgeTransferProps
} from './BridgeTransfer'

export class CctpDeposit extends BridgeTransfer {
  constructor(props: BridgeTransferProps) {
    super(props)
  }

  public async fetchStatus(): BridgeTransferFetchStatusFunctionResult {
    return 'source_chain_tx_error'
  }

  public async fetchTimeRemaining(): Promise<string> {
    return 'yes'
  }
}
