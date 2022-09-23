import { ChainId } from './networks'

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
> = `${typeof NonCanonicalTokensBridgeInfo[T]['supportedBridges'][number]}`

export type FastBridgeInfo = {
  name: FastBridgeNames
  imageSrc: string
  href: string
}

export function getFastBridges(
  from: ChainId,
  to: ChainId,
  tokenSymbol: string = 'ETH',
  amount?: string
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
      imageSrc: string
      href: string
    }
  } = {
    [FastBridgeNames.Hop]: {
      imageSrc:
        'https://s3.us-west-1.amazonaws.com/assets.hop.exchange/images/hop_logo.png',
      href: getBridgeDeepLink(FastBridgeNames.Hop)
    },
    [FastBridgeNames.Celer]: {
      imageSrc:
        'https://www.celer.network/static/Black-4d795924d523c9d8d45540e67370465a.png',
      href: getBridgeDeepLink(FastBridgeNames.Celer)
    },
    [FastBridgeNames.Connext]: {
      imageSrc: 'https://bridge.connext.network/logos/logo_white.png',
      href: getBridgeDeepLink(FastBridgeNames.Connext)
    },
    [FastBridgeNames.Across]: {
      imageSrc:
        'https://2085701667-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2Fo33kX1T6RRp4inOcEH1d%2Fuploads%2FVqg353nqWxKYvWS16Amd%2FAcross-logo-greenbg.png?alt=media&token=23d5a067-d417-4b1c-930e-d40ad1d8d89a',
      href: getBridgeDeepLink(FastBridgeNames.Across)
    },
    [FastBridgeNames.Stargate]: {
      imageSrc: 'https://s2.coinmarketcap.com/static/img/coins/64x64/18934.png',
      href: getBridgeDeepLink(FastBridgeNames.Stargate)
    },
    [FastBridgeNames.Synapse]: {
      imageSrc: 'https://s2.coinmarketcap.com/static/img/coins/64x64/12147.png',
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
