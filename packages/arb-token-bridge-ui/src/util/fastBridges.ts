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

export function getFastBridges({
  from,
  to,
  tokenSymbol,
  amount
}: {
  from: ChainId
  to: ChainId
  tokenSymbol: string
  amount: string
}): FastBridgeInfo[] {
  function chainIdToSlug(chainId: ChainId): string {
    switch (chainId) {
      case ChainId.Ethereum:
        return 'ethereum'
      case ChainId.ArbitrumOne:
        return 'arbitrum'
      default:
        return ''
    }
  }

  function getBridgeDeepLink(bridge: FastBridgeNames): string {
    switch (bridge) {
      case FastBridgeNames.Hop:
        return `https://app.hop.exchange/#/send?sourceNetwork=${chainIdToSlug(
          from
        )}&destNetwork=${chainIdToSlug(
          to
        )}&token=${tokenSymbol}&amount=${amount}`
      case FastBridgeNames.Celer:
        return `https://cbridge.celer.network/${from}/${to}/${tokenSymbol}`
      case FastBridgeNames.Connext:
        return `https://bridge.connext.network/${tokenSymbol}-from-${chainIdToSlug(
          from
        )}-to-${chainIdToSlug(to)}?amount=${amount}`
      case FastBridgeNames.Across:
        return `https://across.to/?from=${from}&to=${to}&asset=${tokenSymbol}&amount=${amount}`
      case FastBridgeNames.Stargate:
        return `https://stargate.finance/transfer?srcChain=${chainIdToSlug(
          from
        )}&dstChain=${chainIdToSlug(to)}&srcToken=${tokenSymbol}`
      case FastBridgeNames.Synapse:
        // We can't specify the input chain for Synapse, as it will use whatever the user is connected to.
        // We make sure to prompt a network switch to Arbitrum prior to showing this.
        return `https://synapseprotocol.com/?inputCurrency=${tokenSymbol}&outputCurrency=${tokenSymbol}&outputChain=${to}`
      default:
        return ''
    }
  }

  const bridgeInfo: {
    [bridge in Exclude<
      FastBridgeNames,
      FastBridgeNames.LIFI | FastBridgeNames.Router | FastBridgeNames.Wormhole
    >]: {
      imageSrc: StaticImageData
      href: string
    }
  } = {
    [FastBridgeNames.Hop]: {
      imageSrc: Hop,
      href: getBridgeDeepLink(FastBridgeNames.Hop)
    },
    [FastBridgeNames.Celer]: {
      imageSrc: Celer,
      href: getBridgeDeepLink(FastBridgeNames.Celer)
    },
    [FastBridgeNames.Connext]: {
      imageSrc: Connext,
      href: getBridgeDeepLink(FastBridgeNames.Connext)
    },
    [FastBridgeNames.Across]: {
      imageSrc: Across,
      href: getBridgeDeepLink(FastBridgeNames.Across)
    },
    [FastBridgeNames.Stargate]: {
      imageSrc: Stargate,
      href: getBridgeDeepLink(FastBridgeNames.Stargate)
    },
    [FastBridgeNames.Synapse]: {
      imageSrc: Synapse,
      href: getBridgeDeepLink(FastBridgeNames.Synapse)
    }
  }

  return Object.values(FastBridgeNames)
    .filter(fastBridgeName => {
      // exclude these fast bridges for now
      switch (fastBridgeName) {
        case FastBridgeNames.LIFI:
        case FastBridgeNames.Wormhole:
        case FastBridgeNames.Router:
          return false
        default:
          return true
      }
    })
    .map<FastBridgeInfo>(bridge => {
      const name = bridge as Exclude<
        FastBridgeNames,
        FastBridgeNames.LIFI | FastBridgeNames.Router | FastBridgeNames.Wormhole
      >
      return {
        name,
        imageSrc: bridgeInfo[name].imageSrc,
        href: bridgeInfo[name].href
      }
    })
}

export const NonCanonicalTokensBridgeInfo = {
  [NonCanonicalTokenAddresses.FRAX]: {
    tokenSymbol: 'FRAX',
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

type getHrefParams = {
  from: ChainId
  to: ChainId
  fromTokenAddress: string
  toTokenAddress: string
  amount?: string
  transferMode: 'deposit' | 'withdraw'
}

type USDCFastBridgeInfo = {
  name: FastBridgeNames
  imageSrc: StaticImageData
  getHref: (params: getHrefParams) => string
}

export const USDCFastBridges: USDCFastBridgeInfo[] = [
  {
    name: FastBridgeNames.Celer,
    imageSrc: Celer,
    getHref: ({ transferMode }) => {
      switch (transferMode) {
        case 'deposit':
          return 'https://cbridge.celer.network/bridge/ethereum-arbitrum/'
        case 'withdraw':
        default:
          return 'https://cbridge.celer.network/bridge/arbitrum-ethereum/'
      }
    }
  },
  {
    name: FastBridgeNames.LIFI,
    imageSrc: LIFI,
    getHref: ({
      from,
      to,
      fromTokenAddress,
      toTokenAddress,
      amount,
      transferMode
    }: getHrefParams) => {
      switch (transferMode) {
        case 'deposit':
          return `https://jumper.exchange/?fromChain=${from}&fromToken=${fromTokenAddress}&toChain=${to}&toToken=${toTokenAddress}&fromAmount=${amount}`
        case 'withdraw':
        default:
          return `https://jumper.exchange/?fromChain=${from}&fromToken=${fromTokenAddress}&toChain=${to}&toToken=${toTokenAddress}&fromAmount=${amount}`
      }
    }
  },
  {
    name: FastBridgeNames.Wormhole,
    imageSrc: Wormhole,
    getHref: () => 'https://www.portalbridge.com/usdc-bridge/'
  },
  {
    name: FastBridgeNames.Router,
    imageSrc: Router,
    getHref: ({
      from,
      to,
      fromTokenAddress,
      toTokenAddress,
      transferMode
    }: getHrefParams) => {
      switch (transferMode) {
        case 'deposit':
          return `https://app.thevoyager.io/swap?fromChain=${from}&toChain=${to}&fromToken=${fromTokenAddress}&toToken=${toTokenAddress}`
        case 'withdraw':
        default:
          return `https://app.thevoyager.io/swap?fromChain=${from}&toChain=${to}&fromToken=${fromTokenAddress}&toToken=${toTokenAddress}`
      }
    }
  }
]
