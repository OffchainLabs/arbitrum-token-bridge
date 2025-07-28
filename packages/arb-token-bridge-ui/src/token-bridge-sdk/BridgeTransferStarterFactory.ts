import {
  BridgeTransferStarter,
  BridgeTransferStarterPropsWithChainIds
} from './BridgeTransferStarter'
import { EthDepositStarter } from './EthDepositStarter'
import { Erc20DepositStarter } from './Erc20DepositStarter'
import { EthWithdrawalStarter } from './EthWithdrawalStarter'
import { Erc20WithdrawalStarter } from './Erc20WithdrawalStarter'
import { EthTeleportStarter } from './EthTeleportStarter'
import { Erc20TeleportStarter } from './Erc20TeleportStarter'
import { getBridgeTransferProperties, getProviderForChainId } from './utils'
import { getOftV2TransferConfig } from './oftUtils'
import { OftV2TransferStarter } from './OftV2TransferStarter'
import { LifiData, LifiTransferStarter } from './LifiTransferStarter'

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
    props: BridgeTransferStarterPropsWithChainIds & { lifiData?: LifiData }
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

    const {
      isDeposit: isCanonicalDeposit,
      isNativeCurrencyTransfer,
      isSupported,
      isTeleport,
      isWithdrawal: isCanonicalWithdrawal
    } = getBridgeTransferProperties(props)

    if (!isSupported) {
      throw new Error('Unsupported transfer detected')
    }

    const cacheKey = getCacheKey(props)
    const cacheValue = cache[cacheKey]

    if (typeof cacheValue !== 'undefined') {
      return cacheValue
    }

    const isOft = getOftV2TransferConfig({
      sourceChainId: props.sourceChainId,
      destinationChainId: props.destinationChainId,
      sourceChainErc20Address: props.sourceChainErc20Address
    })

    if (isOft.isValid) {
      return withCache(cacheKey, new OftV2TransferStarter(initProps))
    }

    if (isTeleport) {
      if (isNativeCurrencyTransfer) {
        return withCache(cacheKey, new EthTeleportStarter(initProps))
      }
      return withCache(cacheKey, new Erc20TeleportStarter(initProps))
    }

    if (isCanonicalDeposit) {
      if (!isNativeCurrencyTransfer) {
        return withCache(cacheKey, new Erc20DepositStarter(initProps))
      }
      return withCache(cacheKey, new EthDepositStarter(initProps))
    }

    if (isCanonicalWithdrawal) {
      if (!isNativeCurrencyTransfer) {
        return withCache(cacheKey, new Erc20WithdrawalStarter(initProps))
      }

      return withCache(cacheKey, new EthWithdrawalStarter(initProps))
    }

    if (!props.lifiData) {
      throw new Error('Missing lifiData for LifiTransferStarter')
    }

    return withCache(
      cacheKey,
      new LifiTransferStarter({ ...initProps, lifiData: props.lifiData })
    )
  }
}
