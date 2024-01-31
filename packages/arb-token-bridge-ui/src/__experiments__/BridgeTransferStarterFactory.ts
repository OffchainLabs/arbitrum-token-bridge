import {
  BridgeTransferStarter,
  BridgeTransferStarterConstructorProps
} from './BridgeTransferStarter'

import { Erc20DepositStarter } from './Erc20DepositStarter'

export class BridgeTransferStarterFactory {
  public static async create(
    props: BridgeTransferStarterConstructorProps
  ): Promise<BridgeTransferStarter> {
    return new Erc20DepositStarter(props)
  }
}
