import {
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  BridgeTransferStarterPropsWithChainIds
} from './BridgeTransferStarter'
import { EthDepositStarter } from './EthDepositStarter'
import { Erc20DepositStarter } from './Erc20DepositStarter'
import { EthWithdrawalStarter } from './EthWithdrawalStarter'
import { Erc20WithdrawalStarter } from './Erc20WithdrawalStarter'
import {
  getBridgeTransferProperties,
  getProvider,
  isBridgeTransferStarterPropsWithChainIds
} from './utils'
import { Provider } from '@ethersproject/providers'

export class BridgeTransferStarterFactory {
  public static async create(
    props: BridgeTransferStarterProps | BridgeTransferStarterPropsWithChainIds
  ): Promise<BridgeTransferStarter> {
    // if we are passing the chain ids, we can easily get the providers without additional RPC calls
    // this way, we can pass chain-ids to the `getBridgeTransferProperties` which avoids RPC calls to get chain-ids from providers
    // it is helpful when `BridgeTransferStarterFactory.create` is being called multiple times, like to poll for gas estimates in UI (useGasEstimates.ts)
    let sourceChainProvider: Provider, destinationChainProvider: Provider
    if (isBridgeTransferStarterPropsWithChainIds(props)) {
      sourceChainProvider = getProvider(props.sourceChainId)
      destinationChainProvider = getProvider(props.destinationChainId)
    } else {
      sourceChainProvider = props.sourceChainProvider
      destinationChainProvider = props.destinationChainProvider
    }

    // once we have the providers, we can get the transfer properties, and initialize the classes further
    const initProps = {
      sourceChainProvider,
      destinationChainProvider,
      sourceChainErc20Address: props.sourceChainErc20Address
    }

    const { isDeposit, isNativeCurrencyTransfer, isSupported } =
      await getBridgeTransferProperties(initProps)

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
