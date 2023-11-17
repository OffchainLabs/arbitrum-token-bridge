import { EthBridger } from '@arbitrum/sdk'

import {
  BridgeTransferStarter,
  BridgeTransferStarterStartFunctionProps
} from './BridgeTransferStarter'
import { BridgeTransfer } from './BridgeTransfer'

export class EthDepositStarter extends BridgeTransferStarter {
  public async start(
    props: BridgeTransferStarterStartFunctionProps
  ): Promise<BridgeTransfer> {
    const ethBridger = await EthBridger.fromProvider(
      this.destinationChainProvider
    )

    return ethBridger.deposit({
      amount: props.amount,
      l1Signer: props.sourceChainSigner
    })
  }
}
