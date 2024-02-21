import {
  BridgeTransferStarter,
  BridgeTransferStarterProps
} from './BridgeTransferStarter'
import { EthDepositStarter } from './EthDepositStarter'
import { Erc20DepositStarter } from './Erc20DepositStarter'
import { EthWithdrawalStarter } from './EthWithdrawalStarter'
import { Erc20WithdrawalStarter } from './Erc20WithdrawalStarter'
import { getBridgeTransferPropertiesFromProviders } from './utils'

export class BridgeTransferStarterFactory {
  public static async init(
    initProps: BridgeTransferStarterProps
  ): Promise<BridgeTransferStarter> {
    const {
      sourceChainProvider,
      destinationChainProvider,
      sourceChainErc20Address
    } = initProps

    const { isDeposit, isNativeCurrencyTransfer } =
      await getBridgeTransferPropertiesFromProviders({
        sourceChainProvider,
        destinationChainProvider,
        sourceChainErc20Address
      })

    if (isDeposit && isNativeCurrencyTransfer) {
      // return Eth deposit
      console.log('bridge-sdk mode: Eth Deposit')
      return new EthDepositStarter(initProps)
    }

    if (!isDeposit && isNativeCurrencyTransfer) {
      // return Eth withdrawal
      console.log('bridge-sdk mode: Eth Withdrawal')
      return new EthWithdrawalStarter(initProps)
    }

    if (isDeposit && !isNativeCurrencyTransfer) {
      // return Erc20 deposit
      console.log('bridge-sdk mode: Erc20 Deposit')
      return new Erc20DepositStarter(initProps)
    }

    if (!isDeposit && !isNativeCurrencyTransfer) {
      // return Erc20 withdrawal
      console.log('bridge-sdk mode: Erc20 Withdrawal')
      return new Erc20WithdrawalStarter(initProps)
    }

    // else throw an error - chain pair not valid eg. L1-to-L3 transfer,
    throw Error('bridge-sdk mode: unhandled mode detected')
  }
}
