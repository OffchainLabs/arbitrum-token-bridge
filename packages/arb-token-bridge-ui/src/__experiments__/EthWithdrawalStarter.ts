import { EthBridger } from '@arbitrum/sdk'

import {
  BridgeTransferStarter,
  BridgeTransferStarterStartProps,
  BridgeTransferStarterStartResult
} from './BridgeTransferStarter'

export class EthWithdrawalStarter extends BridgeTransferStarter {
  public async start(
    props: BridgeTransferStarterStartProps
  ): BridgeTransferStarterStartResult {
    const ethBridger = await EthBridger.fromProvider(this.fromChainProvider)
    const address = await props.fromChainSigner.getAddress()

    return ethBridger.withdraw({
      amount: props.amount,
      l2Signer: props.fromChainSigner,
      destinationAddress: props.destinationAddress ?? address,
      from: address
    })
  }
}
