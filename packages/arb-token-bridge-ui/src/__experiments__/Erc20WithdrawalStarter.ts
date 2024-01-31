import { Erc20Bridger } from '@arbitrum/sdk'
import {
  BridgeTransferStarter,
  BridgeTransferStarterStartProps,
  BridgeTransferStarterStartResult
} from './BridgeTransferStarter'

export class Erc20WithdrawalStarter extends BridgeTransferStarter {
  public async start(
    props: BridgeTransferStarterStartProps
  ): BridgeTransferStarterStartResult {
    const erc20Bridger = await Erc20Bridger.fromProvider(this.toChainProvider)
    const address = await props.fromChainSigner.getAddress()

    return erc20Bridger.withdraw({
      amount: props.amount,
      l2Signer: props.fromChainSigner,
      destinationAddress: props.destinationAddress ?? address,
      // todo: get parent chain erc20 address from this one
      erc20l1Address: this.fromChainErc20ContractAddress ?? ''
    })
  }
}
