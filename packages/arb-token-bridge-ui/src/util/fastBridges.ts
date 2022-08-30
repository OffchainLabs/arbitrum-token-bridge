import { ChainId } from './networks'

enum FastBridgeNames {
  Hop = 'Hop',
  Celer = 'Celer',
  Connext = 'Connext',
  Across = 'Across'
}

enum CanonicalTokenNames {
  FRAX = 'FRAX'
}

export type FastBridgeName = `${FastBridgeNames}`
export type CanonicalTokenName = `${CanonicalTokenNames}`

type FastBridgeInfo = {
  name: FastBridgeNames
  imageSrc: string
  href: string
}

export function getFastBridges(
  from: ChainId,
  to: ChainId,
  tokenSymbol: string
): FastBridgeInfo[] {
  const supportedDirections: {
    [bridge in FastBridgeNames]: {
      [chainId in ChainId]?: ChainId | string
    }
  } = {
    [FastBridgeNames.Hop]: {
      [ChainId.Mainnet]: 'ethereum',
      [ChainId.ArbitrumOne]: 'arbitrum'
    },
    [FastBridgeNames.Celer]: {
      [ChainId.Mainnet]: ChainId.Mainnet,
      [ChainId.ArbitrumOne]: ChainId.ArbitrumOne
    },
    [FastBridgeNames.Connext]: {
      [ChainId.Mainnet]: 'ethereum',
      [ChainId.ArbitrumOne]: 'arbitrum'
    },
    [FastBridgeNames.Across]: {
      [ChainId.Mainnet]: ChainId.Mainnet,
      [ChainId.ArbitrumOne]: ChainId.ArbitrumOne
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
      href: `https://app.hop.exchange/#/send?sourceNetwork=${
        supportedDirections[FastBridgeNames.Hop][from]
      }&destNetwork=${
        supportedDirections[FastBridgeNames.Hop][to]
      }&token=${tokenSymbol}`
    },
    [FastBridgeNames.Celer]: {
      imageSrc:
        'https://www.celer.network/static/Black-4d795924d523c9d8d45540e67370465a.png',
      href: `https://cbridge.celer.network/${
        supportedDirections[FastBridgeNames.Celer][from]
      }/${supportedDirections[FastBridgeNames.Celer][to]}/${tokenSymbol}`
    },
    [FastBridgeNames.Connext]: {
      imageSrc: 'https://bridge.connext.network/logos/logo_white.png',
      href: `https://bridge.connext.network/${tokenSymbol}-from-${
        supportedDirections[FastBridgeNames.Connext][from]
      }-to-${supportedDirections[FastBridgeNames.Connext][to]}`
    },
    [FastBridgeNames.Across]: {
      imageSrc:
        'https://2085701667-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2Fo33kX1T6RRp4inOcEH1d%2Fuploads%2FVqg353nqWxKYvWS16Amd%2FAcross-logo-greenbg.png?alt=media&token=23d5a067-d417-4b1c-930e-d40ad1d8d89a',
      href: `https://across.to/?from=${
        supportedDirections[FastBridgeNames.Across][from]
      }&to=${supportedDirections[FastBridgeNames.Across][to]}`
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

export const CanonicalTokensBridgeInfo: {
  [tokenSymbol in string]: {
    supportedBridges: FastBridgeNames[]
    learnMoreUrl: string
    bridgeUrl: string
  }
} = {
  [CanonicalTokenNames.FRAX]: {
    supportedBridges: [FastBridgeNames.Celer],
    learnMoreUrl: 'https://docs.frax.finance/cross-chain/bridge',
    bridgeUrl: 'https://app.frax.finance/bridge?chain=arbitrum'
  }
}
