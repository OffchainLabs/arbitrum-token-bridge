import {
  BridgeTransferStarter,
  BridgeTransferStarterPropsWithChainIds
} from './BridgeTransferStarter'
import { EthDepositStarter } from './EthDepositStarter'
import { EthDepositStarterViem } from './EthDepositStarterViem'
import { Erc20DepositStarter } from './Erc20DepositStarter'
import { EthWithdrawalStarter } from './EthWithdrawalStarter'
import { Erc20WithdrawalStarter } from './Erc20WithdrawalStarter'
import { EthTeleportStarter } from './EthTeleportStarter'
import { Erc20TeleportStarter } from './Erc20TeleportStarter'
import { getBridgeTransferProperties, getProviderForChainId } from './utils'
import { type PublicClient, type WalletClient } from 'viem'

function getCacheKey(props: BridgeTransferStarterPropsWithChainIds): string {
  let cacheKey = `source:${props.sourceChainId}-destination:${props.destinationChainId}`

  if (props.sourceChainErc20Address) {
    cacheKey += `-sourceErc20:${props.sourceChainErc20Address}`
  }

  if (props.destinationChainErc20Address) {
    cacheKey += `-destinationErc20:${props.destinationChainErc20Address}`
  }

  return cacheKey
}

function withCache(
  key: string,
  value: BridgeTransferStarter
): BridgeTransferStarter {
  cache[key] = value
  return value
}

const cache: { [key: string]: BridgeTransferStarter } = {}

export class BridgeTransferStarterFactory {
  public static create(
    props: BridgeTransferStarterPropsWithChainIds & {
      useViem?: boolean
      sourcePublicClient?: PublicClient
      destinationPublicClient?: PublicClient
      walletClient?: WalletClient
    }
  ): BridgeTransferStarter {
    const sourceChainProvider = getProviderForChainId(props.sourceChainId)
    const destinationChainProvider = getProviderForChainId(
      props.destinationChainId
    )

    // once we have the providers, we can get the transfer properties, and initialize the classes further
    const initProps = {
      sourceChainProvider,
      destinationChainProvider,
      sourceChainErc20Address: props.sourceChainErc20Address,
      destinationChainErc20Address: props.destinationChainErc20Address
    }

    const { isDeposit, isNativeCurrencyTransfer, isSupported, isTeleport } =
      getBridgeTransferProperties(props)

    if (!isSupported) {
      throw new Error('Unsupported transfer detected')
    }

    const cacheKey = getCacheKey(props)
    const cacheValue = cache[cacheKey]

    if (typeof cacheValue !== 'undefined') {
      return cacheValue
    }

    if (isTeleport) {
      if (isNativeCurrencyTransfer) {
        return withCache(cacheKey, new EthTeleportStarter(initProps))
      }
      return withCache(cacheKey, new Erc20TeleportStarter(initProps))
    }

    // deposits
    if (isDeposit) {
      if (!isNativeCurrencyTransfer) {
        return withCache(cacheKey, new Erc20DepositStarter(initProps))
      }
      // Use Viem-based deposit starter if specified and all required clients are provided
      if (
        props.useViem &&
        props.sourcePublicClient &&
        props.destinationPublicClient &&
        props.walletClient
      ) {
        return withCache(
          cacheKey,
          new EthDepositStarterViem(
            props.sourcePublicClient,
            props.destinationPublicClient,
            props.walletClient
          )
        )
      }
      return withCache(cacheKey, new EthDepositStarter(initProps))
    }
    // withdrawals
    if (!isNativeCurrencyTransfer) {
      return withCache(cacheKey, new Erc20WithdrawalStarter(initProps))
    }
    return withCache(cacheKey, new EthWithdrawalStarter(initProps))
  }
}
