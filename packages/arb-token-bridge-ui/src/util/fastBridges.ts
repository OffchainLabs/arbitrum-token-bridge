import { StaticImageData } from 'next/image'

import Hop from '@/images/bridge/hop.png'
import Celer from '@/images/bridge/celer.png'
import Connext from '@/images/bridge/connext.png'
import Across from '@/images/bridge/across.png'
import Stargate from '@/images/bridge/stargate.png'
import Synapse from '@/images/bridge/synapse.png'
import Wormhole from '@/images/bridge/wormhole.svg'
import LIFI from '@/images/bridge/lifi.webp'
import Router from '@/images/bridge/router.webp'

import { ChainId } from './networks'
import { USDC_LEARN_MORE_LINK } from '../constants'

export enum FastBridgeNames {
  Hop = 'Hop',
  Celer = 'Celer',
  Connext = 'Connext',
  Across = 'Across',
  Stargate = 'Stargate',
  Synapse = 'Synapse',
  Wormhole = 'Wormhole',
  LIFI = 'LI.FI',
  Router = 'Router'
}

export enum SpecialTokenSymbol {
  USDC = 'USDC'
}

export enum NonCanonicalTokenNames {
  FRAX = 'FRAX'
}

export enum NonCanonicalTokenAddresses {
  FRAX = '0x853d955acef822db058eb8505911ed77f175b99e'
}

export type NonCanonicalTokenSupportedBridges<
  T extends NonCanonicalTokenAddresses
> = `${(typeof NonCanonicalTokensBridgeInfo)[T]['supportedBridges'][number]}`

export type FastBridgeInfo = {
  name: FastBridgeNames
  imageSrc: StaticImageData
  href: string
}

type DeepLinkBridgeInfo = {
  from: ChainId
  to: ChainId
  tokenSymbol?: string
  amount: string
}

type DeepLinkSwapInfo = {
  from: ChainId
  to: ChainId
  fromTokenAddress: string
  toTokenAddress: string
  amount: string
}

function getFastBridgeSlugs(fastBridgeName: FastBridgeNames): {
  [key in ChainId]?: string
} {
  switch (fastBridgeName) {
    case FastBridgeNames.Hop:
      return {
        [ChainId.Mainnet]: 'ethereum',
        [ChainId.ArbitrumOne]: 'arbitrum',
        [ChainId.ArbitrumNova]: 'nova'
      }
    default:
      return {
        [ChainId.Mainnet]: 'mainnet',
        [ChainId.ArbitrumOne]: 'arbitrum',
        [ChainId.ArbitrumNova]: 'arbitrum-nova'
      }
  }
}

function getFastBridgeImage(fastBridgeName: FastBridgeNames) {
  switch (fastBridgeName) {
    case FastBridgeNames.Hop:
      return Hop
    case FastBridgeNames.Celer:
      return Celer
    case FastBridgeNames.Connext:
      return Connext
    case FastBridgeNames.Across:
      return Across
    case FastBridgeNames.Stargate:
      return Stargate
    case FastBridgeNames.Synapse:
      return Synapse
    case FastBridgeNames.LIFI:
      return LIFI
    case FastBridgeNames.Wormhole:
      return Wormhole
    case FastBridgeNames.Router:
      return Router
  }
}

function getBridgeDeepLink(
  fastBridgeName: FastBridgeNames,
  deepLinkInfo: DeepLinkBridgeInfo
) {
  const { from, to, tokenSymbol, amount } = deepLinkInfo
  const slugs = getFastBridgeSlugs(fastBridgeName)
  const slugFrom = slugs[from]
  const slugTo = slugs[to]

  switch (fastBridgeName) {
    case FastBridgeNames.Hop:
      return `https://app.hop.exchange/#/send?sourceNetwork=${slugFrom}&destNetwork=${slugTo}&token=${tokenSymbol}&amount=${amount}`
    case FastBridgeNames.Celer:
      return `https://cbridge.celer.network/${from}/${to}/${tokenSymbol}`
    case FastBridgeNames.Connext:
      return `https://bridge.connext.network/${tokenSymbol}-from-${slugFrom}-to-${slugTo}?amount=${amount}`
    case FastBridgeNames.Across:
      return `https://across.to/?from=${from}&to=${to}&asset=${tokenSymbol}&amount=${amount}`
    case FastBridgeNames.Stargate:
      return `https://stargate.finance/transfer?srcChain=${slugFrom}&dstChain=${slugTo}&srcToken=${tokenSymbol}`
    case FastBridgeNames.Synapse:
      // We can't specify the input chain for Synapse, as it will use whatever the user is connected to.
      // We make sure to prompt a network switch to Arbitrum prior to showing this.
      return `https://synapseprotocol.com/?inputCurrency=${tokenSymbol}&outputCurrency=${tokenSymbol}&outputChain=${to}`
    case FastBridgeNames.Wormhole:
      return 'https://www.portalbridge.com/usdc-bridge/'
    default:
      return ''
  }
}

function getSwapDeepLink(
  fastBridgeName: FastBridgeNames,
  deepLinkInfo: DeepLinkSwapInfo
) {
  const { from, to, fromTokenAddress, toTokenAddress, amount } = deepLinkInfo

  switch (fastBridgeName) {
    case FastBridgeNames.LIFI:
      return `https://jumper.exchange/?fromChain=${from}&fromToken=${fromTokenAddress}&toChain=${to}&toToken=${toTokenAddress}&fromAmount=${amount}`
    case FastBridgeNames.Router:
      return `https://app.thevoyager.io/swap?fromChain=${from}&toChain=${to}&fromToken=${fromTokenAddress}&toToken=${toTokenAddress}`
    default:
      return ''
  }
}

export function getFastBridges<TransferType extends 'bridge' | 'swap'>({
  deepLinkInfo,
  supportedFastBridgeNames = [],
  disabledFastBridgeNames = []
}: {
  deepLinkInfo: TransferType extends 'bridge'
    ? DeepLinkBridgeInfo
    : DeepLinkSwapInfo
  supportedFastBridgeNames?: FastBridgeNames[]
  disabledFastBridgeNames?: FastBridgeNames[]
}): FastBridgeInfo[] {
  const isSwapTransfer =
    typeof (deepLinkInfo as DeepLinkSwapInfo).fromTokenAddress !== 'undefined'

  const bridgeNames =
    supportedFastBridgeNames.length > 0
      ? supportedFastBridgeNames
      : Object.values(FastBridgeNames)

  const filteredFastBridgeNames = bridgeNames.filter(
    bridgeName => !disabledFastBridgeNames.includes(bridgeName)
  )

  return filteredFastBridgeNames.map(bridgeName => {
    return {
      name: bridgeName,
      imageSrc: getFastBridgeImage(bridgeName),
      href: isSwapTransfer
        ? getSwapDeepLink(bridgeName, deepLinkInfo as DeepLinkSwapInfo)
        : getBridgeDeepLink(bridgeName, deepLinkInfo as DeepLinkBridgeInfo)
    }
  })
}

export const NonCanonicalTokensBridgeInfo = {
  [NonCanonicalTokenAddresses.FRAX]: {
    tokenSymbol: 'FRAX',
    tokenSymbolOnArbitrum: 'arbiFRAX',
    supportedBridges: [FastBridgeNames.Celer],
    learnMoreUrl: 'https://docs.frax.finance/cross-chain/bridge',
    bridgeUrl: 'https://app.frax.finance/bridge?chain=arbitrum'
  }
} as const

export const USDCBridgeInfo = {
  tokenSymbol: 'USDC',
  tokenSymbolOnArbitrum: 'USDC.e',
  supportedBridges: [
    FastBridgeNames.Celer,
    FastBridgeNames.LIFI,
    FastBridgeNames.Wormhole,
    FastBridgeNames.Router
  ],
  learnMoreUrl: USDC_LEARN_MORE_LINK
} as const
