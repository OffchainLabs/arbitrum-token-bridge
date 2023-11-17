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

    if (isNetwork(sourceChainId).isEthereumMainnetOrTestnet) {
      // todo: add case for ETH deposit as well
      return new Erc20DepositStarter(props)
    } else {
      // todo: add case for ERC20 deposit as well
      return new Erc20WithdrawalStarter(props)
    }
  }
}
