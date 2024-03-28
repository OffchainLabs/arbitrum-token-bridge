import {
  BridgeTransferStarter,
  BridgeTransferStarterProps
} from './BridgeTransferStarter'
import { EthDepositStarter } from './EthDepositStarter'
import { Erc20DepositStarter } from './Erc20DepositStarter'
import { EthWithdrawalStarter } from './EthWithdrawalStarter'
import { Erc20WithdrawalStarter } from './Erc20WithdrawalStarter'
import { getBridgeTransferProperties } from './utils'

export class BridgeTransferStarterFactory {
  public static async create(
    initProps: BridgeTransferStarterProps
  ): Promise<BridgeTransferStarter> {
    const {
      sourceChainProvider,
      destinationChainProvider,
      sourceChainErc20Address
    } = initProps

    const { isDeposit, isNativeCurrencyTransfer, isSupported } =
      await getBridgeTransferProperties({
        sourceChainProvider,
        destinationChainProvider,
        sourceChainErc20Address
      })

    if (!isSupported) {
      throw new Error('Unsupported transfer detected')
    }

    // deposits
    if (isDeposit) {
      if (!isNativeCurrencyTransfer) {
        return new Erc20DepositStarter(initProps)
      }

      return new EthDepositStarter(initProps)
    }
    // withdrawals
    if (!isNativeCurrencyTransfer) {
      return new Erc20WithdrawalStarter(initProps)
    }
    return new EthWithdrawalStarter(initProps)
  }
}
