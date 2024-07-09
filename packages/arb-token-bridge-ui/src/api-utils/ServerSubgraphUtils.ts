import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject
} from '@apollo/client'

import { ChainId } from '../util/networks'

const SELF_HOSTED_SUBGRAPH = 'self-hosted'

/**
 * Determines whether to use The Graph Network over The Graph Hosted Service.
 */
const theGraphNetworkEnabled = process.env.THE_GRAPH_NETWORK_ENABLED === 'true'

/**
 * The API key to be used for calls to The Graph Network.
 */
const theGraphNetworkApiKey = process.env.THE_GRAPH_NETWORK_API_KEY

const selfHostedSubgraphApiKey = process.env.SELF_HOSTED_SUBGRAPH_API_KEY

type SubgraphKey = keyof typeof subgraphs

type TheGraphNetworkSubgraphId =
  (typeof subgraphs)[SubgraphKey]['theGraphNetworkSubgraphId']

type TheGraphHostedServiceSubgraphName =
  (typeof subgraphs)[SubgraphKey]['theGraphHostedServiceSubgraphName']

const subgraphs = {
  // CCTP Mainnet Subgraphs
  'cctp-ethereum': {
    theGraphNetworkSubgraphId: 'E6iPLnDGEgrcc4gu9uiHJxENSRAAzTvUJqQqJcHZqJT1',
    theGraphHostedServiceSubgraphName: 'chrstph-dvx/cctp-mainnet'
  },
  'cctp-arbitrum-one': {
    theGraphNetworkSubgraphId: '9DgSggKVrvfi4vdyYTdmSBuPgDfm3D7zfLZ1qaQFjYYW',
    theGraphHostedServiceSubgraphName: 'chrstph-dvx/cctp-arb-one'
  },
  // CCTP Testnet Subgraphs
  'cctp-sepolia': {
    theGraphNetworkSubgraphId: '4gSU1PTxjYPWk2TXPX2fusjuXrBFHC7kCZrbhrhaF9V5',
    theGraphHostedServiceSubgraphName: 'chrstph-dvx/cctp-sepolia'
  },
  'cctp-arbitrum-sepolia': {
    theGraphNetworkSubgraphId: '4Dp9ENSFDKfeBsmZeSyATKKrhxC2EKzbC3bZvTHpU1DB',
    theGraphHostedServiceSubgraphName: 'chrstph-dvx/cctp-arb-sepolia'
  },
  // L1 Mainnet Subgraphs
  'l1-arbitrum-one': {
    theGraphNetworkSubgraphId: 'F2N4nGH86Y5Bk2vPo15EVRSTz2wbtz7BGRe8DDJqMPG4',
    theGraphHostedServiceSubgraphName: 'gvladika/arb-bridge-eth-nitro'
  },
  'l1-arbitrum-nova': {
    theGraphNetworkSubgraphId: '6Xvyjk9r91N3DSRQP6UZ1Lkbou567hFxLSWt2Tsv5AWp',
    theGraphHostedServiceSubgraphName: 'gvladika/arb-bridge-eth-nova'
  },
  // L1 Testnet Subgraphs
  'l1-arbitrum-sepolia': {
    theGraphNetworkSubgraphId: 'GF6Ez7sY2gef8EoXrR76X6iFa41wf38zh4TXZkDkL5Z9',
    theGraphHostedServiceSubgraphName: 'fionnachan/arb-bridge-eth-sepolia'
  },
  // L2 Mainnet Subgraphs
  'l2-arbitrum-one': {
    theGraphNetworkSubgraphId: '9eFk14Tms68qBN7YwL6kFuk9e2BVRqkX6gXyjzLR3tuj',
    theGraphHostedServiceSubgraphName: 'gvladika/layer2-token-gateway-arb1'
  },
  // L2 Nova Subgraphs
  'l2-arbitrum-nova': {
    theGraphNetworkSubgraphId: SELF_HOSTED_SUBGRAPH,
    theGraphHostedServiceSubgraphName: 'fionnachan/layer2-token-gateway-nova'
  },
  // L2 Testnet Subgraphs
  'l2-arbitrum-sepolia': {
    theGraphNetworkSubgraphId: 'AaUuKWWuQbCXbvRkXpVDEpw9B7oVicYrovNyMLPZtLPw',
    theGraphHostedServiceSubgraphName: 'fionnachan/layer2-token-gateway-sepolia'
  },
  // Teleport Sepolia
  'teleporter-sepolia': {
    theGraphNetworkSubgraphId: '6AwhH4JF8Ss5ZFf12azD13D1nNhuNzLnjH56irYqA7fD',
    theGraphHostedServiceSubgraphName: '' // we don't have a hosted service subgraph for teleports
  },
  'teleporter-ethereum': {
    theGraphNetworkSubgraphId: 'GEVHWg3FLKvWivMhqkeVrQVt4WCN6cWnsvdf6MpNrHpg',
    theGraphHostedServiceSubgraphName: '' // we don't have a hosted service subgraph for teleports
  }
} as const

function createApolloClient(uri: string) {
  return new ApolloClient({
    link: new HttpLink({ uri, fetch }),
    cache: new InMemoryCache()
  })
}

function createSelfHostedSubgraphClient(subgraphName: string) {
  if (
    typeof selfHostedSubgraphApiKey === 'undefined' ||
    selfHostedSubgraphApiKey === ''
  ) {
    throw new Error(
      `[createSelfHostedSubgraphClient] missing "SELF_HOSTED_SUBGRAPH_API_KEY" env variable`
    )
  }
  return createApolloClient(
    `https://graph.arbitrum.io/${selfHostedSubgraphApiKey}/subgraphs/name/${subgraphName}`
  )
}

function createTheGraphNetworkClient(subgraphId: TheGraphNetworkSubgraphId) {
  if (
    typeof theGraphNetworkApiKey === 'undefined' ||
    theGraphNetworkApiKey === ''
  ) {
    throw new Error(
      `[createTheGraphNetworkClient] missing "GRAPH_NETWORK_API_KEY" env variable"`
    )
  }

  return createApolloClient(
    `https://gateway-arbitrum.network.thegraph.com/api/${theGraphNetworkApiKey}/subgraphs/id/${subgraphId}`
  )
}

function createTheGraphHostedServiceClient(
  subgraphName: TheGraphHostedServiceSubgraphName
) {
  return createApolloClient(
    `https://api.thegraph.com/subgraphs/name/${subgraphName}`
  )
}

function createSubgraphClient(key: SubgraphKey) {
  console.log(`[createSubgraphClient] key=${key}`)

  const { theGraphHostedServiceSubgraphName, theGraphNetworkSubgraphId } =
    subgraphs[key]

  if (theGraphNetworkSubgraphId === SELF_HOSTED_SUBGRAPH) {
    return createSelfHostedSubgraphClient(theGraphHostedServiceSubgraphName)
  }

  if (!theGraphNetworkEnabled) {
    console.log(
      `[createSubgraphClient] using subgraph "${theGraphHostedServiceSubgraphName}" on the graph hosted service\n`
    )
    return createTheGraphHostedServiceClient(theGraphHostedServiceSubgraphName)
  }
  try {
    console.log(
      `[createSubgraphClient] using subgraph "${theGraphNetworkSubgraphId}" on the graph network`
    )
    return createTheGraphNetworkClient(theGraphNetworkSubgraphId)
  } catch (err) {
    console.warn(
      `[createSubgraphClient] failed to create client for subgraph "${theGraphNetworkSubgraphId}" on the graph network`
    )
    console.warn(
      `[createSubgraphClient] falling back to subgraph "${theGraphHostedServiceSubgraphName}" on the graph hosted service\n`
    )
    return createTheGraphHostedServiceClient(theGraphHostedServiceSubgraphName)
  }
}

export function getCctpSubgraphClient(chainId: number) {
  switch (chainId) {
    case ChainId.Ethereum:
      return createSubgraphClient('cctp-ethereum')

    case ChainId.ArbitrumOne:
      return createSubgraphClient('cctp-arbitrum-one')

    case ChainId.Sepolia:
      return createSubgraphClient('cctp-sepolia')

    case ChainId.ArbitrumSepolia:
      return createSubgraphClient('cctp-arbitrum-sepolia')

    default:
      throw new Error(`[getCctpSubgraphClient] unsupported chain: ${chainId}`)
  }
}

export function getTeleporterSubgraphClient(chainId: number) {
  switch (chainId) {
    case ChainId.Ethereum:
      return createTheGraphNetworkClient(
        subgraphs['teleporter-ethereum'].theGraphNetworkSubgraphId
      )

    case ChainId.Sepolia:
      return createTheGraphNetworkClient(
        subgraphs['teleporter-sepolia'].theGraphNetworkSubgraphId
      )

    default:
      throw new Error(
        `[getTeleporterSubgraphClient] unsupported chain: ${chainId}`
      )
  }
}

export function getL1SubgraphClient(l2ChainId: number) {
  switch (l2ChainId) {
    case ChainId.ArbitrumOne:
      return createSubgraphClient('l1-arbitrum-one')

    case ChainId.ArbitrumNova:
      return createSubgraphClient('l1-arbitrum-nova')

    case ChainId.ArbitrumSepolia:
      return createSubgraphClient('l1-arbitrum-sepolia')

    default:
      throw new Error(`[getL1SubgraphClient] unsupported chain: ${l2ChainId}`)
  }
}

export function getL2SubgraphClient(l2ChainId: number) {
  switch (l2ChainId) {
    case ChainId.ArbitrumOne:
      return createSubgraphClient('l2-arbitrum-one')

    case ChainId.ArbitrumNova:
      return createSubgraphClient('l2-arbitrum-nova')

    case ChainId.ArbitrumSepolia:
      return createSubgraphClient('l2-arbitrum-sepolia')

    default:
      throw new Error(`[getL2SubgraphClient] unsupported chain: ${l2ChainId}`)
  }
}

export function getSourceFromSubgraphClient(
  subgraphClient: ApolloClient<NormalizedCacheObject>
): string | null {
  const uri = (subgraphClient.link as any).options?.uri

  if (typeof uri === 'undefined') {
    return null
  }

  return new URL(uri).origin
}
