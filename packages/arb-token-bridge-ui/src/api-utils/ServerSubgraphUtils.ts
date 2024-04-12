import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'

import { ChainId } from '../util/networks'

/**
 * Determines whether to use The Graph Network over The Graph Hosted Service.
 */
const theGraphNetworkEnabled = process.env.THE_GRAPH_NETWORK_ENABLED === 'true'

/**
 * The API key to be used for calls to The Graph Network.
 */
const theGraphNetworkApiKey = process.env.THE_GRAPH_NETWORK_API_KEY

/**
 * Identifiers for subgraphs on The Graph Network.
 */
type TheGraphNetworkSubgraphId =
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

/**
 * Names for subgraphs on The Graph Hosted Service.
 */
type TheGraphHostedServiceSubgraphName =
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

/**
 *
 */
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
    subgraphId: TheGraphNetworkSubgraphId
    subgraphName: TheGraphHostedServiceSubgraphName
  }
> = {
  // CCTP Mainnet Subgraphs
  'cctp-ethereum': {
    subgraphId: 'E6iPLnDGEgrcc4gu9uiHJxENSRAAzTvUJqQqJcHZqJT1',
    subgraphName: 'chrstph-dvx/cctp-mainnet'
  },
  'cctp-arbitrum-one': {
    subgraphId: '9DgSggKVrvfi4vdyYTdmSBuPgDfm3D7zfLZ1qaQFjYYW',
    subgraphName: 'chrstph-dvx/cctp-arb-one'
  },
  // CCTP Testnet Subgraphs
  'cctp-sepolia': {
    subgraphId: '4gSU1PTxjYPWk2TXPX2fusjuXrBFHC7kCZrbhrhaF9V5',
    subgraphName: 'chrstph-dvx/cctp-sepolia'
  },
  'cctp-arbitrum-sepolia': {
    subgraphId: '4Dp9ENSFDKfeBsmZeSyATKKrhxC2EKzbC3bZvTHpU1DB',
    subgraphName: 'chrstph-dvx/cctp-arb-sepolia'
  },
  // L1 Mainnet Subgraphs
  'l1-arbitrum-one': {
    subgraphId: 'F2N4nGH86Y5Bk2vPo15EVRSTz2wbtz7BGRe8DDJqMPG4',
    subgraphName: 'gvladika/arb-bridge-eth-nitro'
  },
  'l1-arbitrum-nova': {
    subgraphId: '6Xvyjk9r91N3DSRQP6UZ1Lkbou567hFxLSWt2Tsv5AWp',
    subgraphName: 'gvladika/arb-bridge-eth-nova'
  },
  // L1 Testnet Subgraphs
  'l1-arbitrum-sepolia': {
    subgraphId: 'GF6Ez7sY2gef8EoXrR76X6iFa41wf38zh4TXZkDkL5Z9',
    subgraphName: 'fionnachan/arb-bridge-eth-sepolia'
  },
  // L2 Mainnet Subgraphs
  'l2-arbitrum-one': {
    subgraphId: '9eFk14Tms68qBN7YwL6kFuk9e2BVRqkX6gXyjzLR3tuj',
    subgraphName: 'gvladika/layer2-token-gateway-arb1'
  },
  // L2 Testnet Subgraphs
  'l2-arbitrum-sepolia': {
    subgraphId: 'AaUuKWWuQbCXbvRkXpVDEpw9B7oVicYrovNyMLPZtLPw',
    subgraphName: 'fionnachan/layer2-token-gateway-sepolia'
  }
}

function createApolloClient(uri: string) {
  return new ApolloClient({
    link: new HttpLink({ uri, fetch }),
    cache: new InMemoryCache()
  })
}

function createGraphNetworkClient(subgraphId: string) {
  if (
    typeof theGraphNetworkApiKey === 'undefined' ||
    theGraphNetworkApiKey === ''
  ) {
    throw new Error(
      `[createGraphNetworkClient] missing "GRAPH_NETWORK_API_KEY" env variable"`
    )
  }

  return createApolloClient(
    `https://gateway-arbitrum.network.thegraph.com/api/${theGraphNetworkApiKey}/subgraphs/id/${subgraphId}`
  )
}

function createGraphHostedServiceClient(subgraphName: string) {
  return createApolloClient(
    `https://api.thegraph.com/subgraphs/name/${subgraphName}`
  )
}

function createSubgraphClient(identifier: ReadableSubgraphIdentifier) {
  console.log(`[createSubgraphClient] identifier=${identifier}`)

  const { subgraphId, subgraphName } = subgraphs[identifier]

  if (!theGraphNetworkEnabled) {
    console.log(
      `[createSubgraphClient] using subgraph "${subgraphName}" on the graph hosted service\n`
    )
    return createGraphHostedServiceClient(subgraphName)
  }

  try {
    console.log(
      `[createSubgraphClient] using subgraph "${subgraphId}" on the graph network`
    )
    return createGraphNetworkClient(subgraphId)
  } catch (err) {
    console.warn(
      `[createSubgraphClient] failed to create client for subgraph "${subgraphId}" on the graph network`
    )
    console.warn(
      `[createSubgraphClient] falling back to subgraph "${subgraphName}" on the graph hosted service\n`
    )
    return createGraphHostedServiceClient(subgraphName)
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
