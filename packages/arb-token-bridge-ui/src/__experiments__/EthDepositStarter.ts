import { EthBridger } from '@arbitrum/sdk'

import {
  BridgeTransferStarter,
  BridgeTransferStarterStartProps,
  BridgeTransferStarterStartResult
} from './BridgeTransferStarter'

export class EthDepositStarter extends BridgeTransferStarter {
  public async start(
    props: BridgeTransferStarterStartProps
  ): BridgeTransferStarterStartResult {
    const ethBridger = await EthBridger.fromProvider(this.toChainProvider)

    return ethBridger.deposit({
      amount: props.amount,
      l1Signer: props.fromChainSigner
    })
  }
}
