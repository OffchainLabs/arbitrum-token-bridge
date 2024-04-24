import {
  BridgeTransferStarter,
  BridgeTransferStarterPropsWithChainIds
} from './BridgeTransferStarter'
import { EthDepositStarter } from './EthDepositStarter'
import { Erc20DepositStarter } from './Erc20DepositStarter'
import { EthWithdrawalStarter } from './EthWithdrawalStarter'
import { Erc20WithdrawalStarter } from './Erc20WithdrawalStarter'
import { getBridgeTransferProperties } from './utils'
import { getProviderForChainId } from '../hooks/useNetworks'

export class BridgeTransferStarterFactory {
  public static create(
    props: BridgeTransferStarterPropsWithChainIds
  ): BridgeTransferStarter {
    const sourceChainProvider = getProviderForChainId(props.sourceChainId)
    const destinationChainProvider = getProviderForChainId(
      props.destinationChainId
    )

    // once we have the providers, we can get the transfer properties, and initialize the classes further
    const initProps = {
      sourceChainProvider,
      destinationChainProvider,
      sourceChainErc20Address: props.sourceChainErc20Address
    }

    const { isDeposit, isNativeCurrencyTransfer, isSupported } =
      getBridgeTransferProperties(props)

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
