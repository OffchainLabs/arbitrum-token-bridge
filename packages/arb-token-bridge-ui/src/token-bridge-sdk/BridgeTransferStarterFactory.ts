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

function getCacheKey(props: BridgeTransferStarterPropsWithChainIds): string {
  let cacheKey = `source:${props.sourceChainId}-destination:${props.destinationChainId}`

  if (props.sourceChainErc20Address) {
    cacheKey += `-sourceErc20:${props.sourceChainErc20Address}`
  }

  return cacheKey
}

const cache: { [key: string]: BridgeTransferStarter } = {}

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

    const cacheKey = getCacheKey(props)
    const cacheValue = cache[cacheKey]

    if (typeof cacheValue !== 'undefined') {
      return cacheValue
    }

    // deposits
    if (isDeposit) {
      if (!isNativeCurrencyTransfer) {
        const starter = new Erc20DepositStarter(initProps)
        cache[cacheKey] = starter
        return starter
      }

      const starter = new EthDepositStarter(initProps)
      cache[cacheKey] = starter
      return starter
    }
    // withdrawals
    if (!isNativeCurrencyTransfer) {
      const starter = new Erc20WithdrawalStarter(initProps)
      cache[cacheKey] = starter
      return starter
    }
    const starter = new EthWithdrawalStarter(initProps)
    cache[cacheKey] = starter
    return starter
  }
}
