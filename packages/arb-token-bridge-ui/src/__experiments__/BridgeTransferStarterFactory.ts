import { isNetwork } from '../util/networks'
import {
  BridgeTransferStarter,
  BridgeTransferStarterConstructorProps
} from './BridgeTransferStarter'
import { Erc20WithdrawalStarter } from './Erc20WithdrawalStarter'
import { Erc20DepositStarter } from './Erc20DepositStarter'

export class BridgeTransferStarterFactory {
  public static async create(
    props: BridgeTransferStarterConstructorProps
  ): Promise<BridgeTransferStarter> {
    const sourceChainId = (await props.sourceChainProvider.getNetwork()).chainId
    const destinationChainId = (
      await props.destinationChainProvider.getNetwork()
    ).chainId

    if (isNetwork(sourceChainId).isEthereum) {
      console.log('ERC 20 DEPOSIT')
      return new Erc20DepositStarter(props)
    } else {
      console.log('ERC 20 WITHDRAWAL')
      return new Erc20WithdrawalStarter(props)
    }
  }
}
