import { ChainId } from './networks'
import { ImageProps } from 'next/image'
import Hop from '@/images/bridge/hop.png'
import Celer from '@/images/bridge/celer.png'
import Connext from '@/images/bridge/connext.png'
import Across from '@/images/bridge/across.png'
import Stargate from '@/images/bridge/stargate.png'
import Synapse from '@/images/bridge/synapse.png'

export enum FastBridgeNames {
  Hop = 'Hop',
  Celer = 'Celer',
  Connext = 'Connext',
  Across = 'Across',
  Stargate = 'Stargate',
  Synapse = 'Synapse'
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
  imageSrc: ImageProps['src']
  href: string
}

export function getFastBridges(
  from: ChainId,
  to: ChainId,
  tokenSymbol = 'ETH',
  amount: string
): FastBridgeInfo[] {
  function chainIdToSlug(chainId: ChainId): string {
    switch (chainId) {
      case ChainId.Mainnet:
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
    [bridge in FastBridgeNames]: {
      imageSrc: ImageProps['src']
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

  return Object.keys(FastBridgeNames).map<FastBridgeInfo>(bridge => {
    const name = bridge as FastBridgeNames
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
    tokenSymbolOnArbitrum: 'arbiFRAX',
    supportedBridges: [FastBridgeNames.Celer],
    learnMoreUrl: 'https://docs.frax.finance/cross-chain/bridge',
    bridgeUrl: 'https://app.frax.finance/bridge?chain=arbitrum'
  }
} as const
