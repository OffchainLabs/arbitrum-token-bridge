import {
  BridgeTransferStarterV2,
  BridgeTransferStarterV2Props
} from './BridgeTransferStarterV2'
import { EthDepositStarterV2 } from './EthDepositV2'
import { Erc20DepositStarterV2 } from './Erc20DepositV2'
import { EthWithdrawalStarterV2 } from './EthWithdrawalV2'
import { Erc20WithdrawalStarterV2 } from './Erc20WithdrawalV2'
import { CctpTransferStarterV2 } from './CctpTransferV2'
import { getBridgeTransferProperties } from './core/getBridgeTransferProperties'

export class BridgeTransferStarterFactoryV2 {
  public static async init(
    initProps: BridgeTransferStarterV2Props
  ): Promise<BridgeTransferStarterV2> {
    const { sourceChainProvider, destinationChainProvider, selectedToken } =
      initProps

    const { isDeposit, isNativeCurrencyTransfer, isUsdcTransfer } =
      await getBridgeTransferProperties({
        sourceChainProvider,
        destinationChainProvider,
        selectedToken
      })

    if (isUsdcTransfer) {
      // return Cctp deposit
      console.log('bridge-sdk mode: CCTP Transfer')
      return new CctpTransferStarterV2({
        ...initProps,
        isDeposit
      })
    }

    if (isDeposit && isNativeCurrencyTransfer) {
      // return Eth deposit
      console.log('bridge-sdk mode: Eth Deposit')
      return new EthDepositStarterV2(initProps)
    }

    if (!isDeposit && isNativeCurrencyTransfer) {
      // return Eth withdrawal
      console.log('bridge-sdk mode: Eth Withdrawal')
      return new EthWithdrawalStarterV2(initProps)
    }

    if (isDeposit && !isNativeCurrencyTransfer) {
      // return Erc20 deposit
      console.log('bridge-sdk mode: Erc20 Deposit')
      return new Erc20DepositStarterV2(initProps)
    }

    if (!isDeposit && !isNativeCurrencyTransfer) {
      // return Erc20 withdrawal
      console.log('bridge-sdk mode: Erc20 Withdrawal')
      return new Erc20WithdrawalStarterV2(initProps)
    }

    // else throw an error - chain pair not valid eg. L1-to-L3 transfer
    throw Error('bridge-sdk mode: unhandled mode detected')
  }
}
