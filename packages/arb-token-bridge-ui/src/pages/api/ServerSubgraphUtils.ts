import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'

import { ChainId } from '../../util/networks'

/**
 * Determines whether to use The Graph Network or The Graph Hosted Service.
 */
const graphNetworkEnabled = process.env.GRAPH_NETWORK_ENABLED === 'true'

/**
 * The API key to be usd for calls to The Graph Network.
 */
const graphNetworkApiKey = process.env.GRAPH_NETWORK_API_KEY

type GraphNetworkSubgraphId =
  // CCTP Mainnet Subgraphs
  | 'E6iPLnDGEgrcc4gu9uiHJxENSRAAzTvUJqQqJcHZqJT1' // CCTP Ethereum
  | '9DgSggKVrvfi4vdyYTdmSBuPgDfm3D7zfLZ1qaQFjYYW' // CCTP Arbitrum One
  // CCTP Testnet Subgraphs
  | '4gSU1PTxjYPWk2TXPX2fusjuXrBFHC7kCZrbhrhaF9V5' // CCTP Sepolia
  | '4Dp9ENSFDKfeBsmZeSyATKKrhxC2EKzbC3bZvTHpU1DB' // CCTP Arbitrum Sepolia
  // L1 Mainnet Subgraphs
  | 'F2N4nGH86Y5Bk2vPo15EVRSTz2wbtz7BGRe8DDJqMPG4' // L1 Arbitrum One
  | '6Xvyjk9r91N3DSRQP6UZ1Lkbou567hFxLSWt2Tsv5AWp' // L1 Arbitrum Nova
  // L1 Testnet Subgraphs
  | 'GF6Ez7sY2gef8EoXrR76X6iFa41wf38zh4TXZkDkL5Z9' // L1 Arbitrum Sepolia
  // L2 Mainnet Subgraphs
  | '9eFk14Tms68qBN7YwL6kFuk9e2BVRqkX6gXyjzLR3tuj' // L2 Arbitrum One
  // L2 Testnet Subgraphs
  | 'AaUuKWWuQbCXbvRkXpVDEpw9B7oVicYrovNyMLPZtLPw' // L2 Arbitrum Sepolia

type GraphHostedServiceSubgraphName =
  // CCTP Mainnet Subgraphs
  | 'chrstph-dvx/cctp-mainnet'
  | 'chrstph-dvx/cctp-arb-one'
  // CCTP Testnet Subgraphs
  | 'chrstph-dvx/cctp-sepolia'
  | 'chrstph-dvx/cctp-arb-sepolia'
  // L1 Mainnet Subgraphs
  | 'gvladika/arb-bridge-eth-nitro'
  | 'gvladika/arb-bridge-eth-nova'
  // L1 Testnet Subgraphs
  | 'fionnachan/arb-bridge-eth-sepolia'
  // L2 Mainnet Subgraphs
  | 'gvladika/layer2-token-gateway-arb1'
  // L2 Testnet Subgraphs
  | 'fionnachan/layer2-token-gateway-sepolia'

type ReadableSubgraphIdentifier =
  | 'cctp-ethereum'
  | 'cctp-arbitrum-one'
  | 'cctp-sepolia'
  | 'cctp-arbitrum-sepolia'
  | 'l1-arbitrum-one'
  | 'l1-arbitrum-nova'
  | 'l1-arbitrum-sepolia'
  | 'l2-arbitrum-one'
  | 'l2-arbitrum-sepolia'

const subgraphs: Record<
  ReadableSubgraphIdentifier,
  {
    graphNetworkSubgraphId: GraphNetworkSubgraphId
    graphHostedServiceSubgraphName: GraphHostedServiceSubgraphName
  }
> = {
  // CCTP Mainnet Subgraphs
  'cctp-ethereum': {
    graphNetworkSubgraphId: 'E6iPLnDGEgrcc4gu9uiHJxENSRAAzTvUJqQqJcHZqJT1',
    graphHostedServiceSubgraphName: 'chrstph-dvx/cctp-mainnet'
  },
  'cctp-arbitrum-one': {
    graphNetworkSubgraphId: '9DgSggKVrvfi4vdyYTdmSBuPgDfm3D7zfLZ1qaQFjYYW',
    graphHostedServiceSubgraphName: 'chrstph-dvx/cctp-arb-one'
  },
  // CCTP Testnet Subgraphs
  'cctp-sepolia': {
    graphNetworkSubgraphId: '4gSU1PTxjYPWk2TXPX2fusjuXrBFHC7kCZrbhrhaF9V5',
    graphHostedServiceSubgraphName: 'chrstph-dvx/cctp-sepolia'
  },
  'cctp-arbitrum-sepolia': {
    graphNetworkSubgraphId: '4Dp9ENSFDKfeBsmZeSyATKKrhxC2EKzbC3bZvTHpU1DB',
    graphHostedServiceSubgraphName: 'chrstph-dvx/cctp-arb-sepolia'
  },
  // L1 Mainnet Subgraphs
  'l1-arbitrum-one': {
    graphNetworkSubgraphId: 'F2N4nGH86Y5Bk2vPo15EVRSTz2wbtz7BGRe8DDJqMPG4',
    graphHostedServiceSubgraphName: 'gvladika/arb-bridge-eth-nitro'
  },
  'l1-arbitrum-nova': {
    graphNetworkSubgraphId: '6Xvyjk9r91N3DSRQP6UZ1Lkbou567hFxLSWt2Tsv5AWp',
    graphHostedServiceSubgraphName: 'gvladika/arb-bridge-eth-nova'
  },
  // L1 Testnet Subgraphs
  'l1-arbitrum-sepolia': {
    graphNetworkSubgraphId: 'GF6Ez7sY2gef8EoXrR76X6iFa41wf38zh4TXZkDkL5Z9',
    graphHostedServiceSubgraphName: 'fionnachan/arb-bridge-eth-sepolia'
  },
  // L2 Mainnet Subgraphs
  'l2-arbitrum-one': {
    graphNetworkSubgraphId: '9eFk14Tms68qBN7YwL6kFuk9e2BVRqkX6gXyjzLR3tuj',
    graphHostedServiceSubgraphName: 'gvladika/layer2-token-gateway-arb1'
  },
  // L2 Testnet Subgraphs
  'l2-arbitrum-sepolia': {
    graphNetworkSubgraphId: 'AaUuKWWuQbCXbvRkXpVDEpw9B7oVicYrovNyMLPZtLPw',
    graphHostedServiceSubgraphName: 'fionnachan/layer2-token-gateway-sepolia'
  }
}

function createApolloClient(uri: string) {
  return new ApolloClient({
    link: new HttpLink({ uri, fetch }),
    cache: new InMemoryCache()
  })
}

function createGraphNetworkClient(subgraphId: string) {
  if (typeof graphNetworkApiKey === 'undefined' || graphNetworkApiKey === '') {
    throw new Error(
      `[createGraphNetworkClient] missing "GRAPH_NETWORK_API_KEY" env variable"`
    )
  }

  return createApolloClient(
    `https://gateway-arbitrum.network.thegraph.com/api/${graphNetworkApiKey}/subgraphs/id/${subgraphId}`
  )
}

function createGraphHostedServiceClient(subgraphName: string) {
  return createApolloClient(
    `https://api.thegraph.com/subgraphs/name/${subgraphName}`
  )
}

function createSubgraphClient(identifier: ReadableSubgraphIdentifier) {
  const { graphNetworkSubgraphId, graphHostedServiceSubgraphName } =
    subgraphs[identifier]

  if (!graphNetworkEnabled) {
    return createGraphHostedServiceClient(graphHostedServiceSubgraphName)
  }

  try {
    return createGraphNetworkClient(graphNetworkSubgraphId)
  } catch (err) {
    console.warn(
      `[createSubgraphClient] failed to create client for subgraph "${graphNetworkSubgraphId}" on the graph network`
    )
    console.warn(
      `[createSubgraphClient] falling back to subgraph "${graphHostedServiceSubgraphName}" on the graph hosted service`
    )
    return createGraphHostedServiceClient(graphNetworkSubgraphId)
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

    case ChainId.ArbitrumSepolia:
      return createSubgraphClient('l2-arbitrum-sepolia')

    default:
      throw new Error(`[getL2SubgraphClient] unsupported chain: ${l2ChainId}`)
  }
}
