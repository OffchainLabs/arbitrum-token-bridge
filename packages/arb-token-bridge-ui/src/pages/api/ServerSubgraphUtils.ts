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

function createClient(uri: string) {
  return new ApolloClient({
    link: new HttpLink({ uri, fetch }),
    cache: new InMemoryCache()
  })
}

function createGraphNetworkClient(subgraphId: string) {
  if (typeof graphNetworkApiKey === 'undefined') {
    throw new Error(
      `[createGraphNetworkClient] missing "GRAPH_NETWORK_API_KEY" env variable"`
    )
  }

  return createClient(
    `https://gateway-arbitrum.network.thegraph.com/api/${graphNetworkApiKey}/subgraphs/id/${subgraphId}`
  )
}

function createGraphHostedServiceClient(subgraphName: string) {
  return createClient(`https://api.thegraph.com/subgraphs/name/${subgraphName}`)
}

// CCTP Subgraphs

const CctpSubgraphClient = {
  // mainnet
  Ethereum: graphNetworkEnabled
    ? createGraphNetworkClient('E6iPLnDGEgrcc4gu9uiHJxENSRAAzTvUJqQqJcHZqJT1')
    : createGraphHostedServiceClient('chrstph-dvx/cctp-mainnet'),
  ArbitrumOne: graphNetworkEnabled
    ? createGraphNetworkClient('9DgSggKVrvfi4vdyYTdmSBuPgDfm3D7zfLZ1qaQFjYYW')
    : createGraphHostedServiceClient('chrstph-dvx/cctp-arb-one'),
  // testnet
  Sepolia: graphNetworkEnabled
    ? createGraphNetworkClient('4gSU1PTxjYPWk2TXPX2fusjuXrBFHC7kCZrbhrhaF9V5')
    : createGraphHostedServiceClient('chrstph-dvx/cctp-sepolia'),
  ArbitrumSepolia: graphNetworkEnabled
    ? createGraphNetworkClient('4Dp9ENSFDKfeBsmZeSyATKKrhxC2EKzbC3bZvTHpU1DB')
    : createGraphHostedServiceClient('chrstph-dvx/cctp-arb-sepolia')
}

export function getCctpSubgraphClient(chainId: number) {
  switch (chainId) {
    case ChainId.Ethereum:
      return CctpSubgraphClient.Ethereum

    case ChainId.ArbitrumOne:
      return CctpSubgraphClient.ArbitrumOne

    case ChainId.Sepolia:
      return CctpSubgraphClient.Sepolia

    case ChainId.ArbitrumSepolia:
      return CctpSubgraphClient.ArbitrumSepolia

    default:
      throw new Error(`[getCctpSubgraphClient] unsupported chain: ${chainId}`)
  }
}

// L1 Subgraphs

const L1SubgraphClient = {
  // mainnet
  ArbitrumOne: graphNetworkEnabled
    ? createGraphNetworkClient('F2N4nGH86Y5Bk2vPo15EVRSTz2wbtz7BGRe8DDJqMPG4')
    : createGraphHostedServiceClient('gvladika/arb-bridge-eth-nitro'),
  ArbitrumNova: graphNetworkEnabled
    ? createGraphNetworkClient('6Xvyjk9r91N3DSRQP6UZ1Lkbou567hFxLSWt2Tsv5AWp')
    : createGraphHostedServiceClient('gvladika/arb-bridge-eth-nova'),
  // testnet
  ArbitrumSepolia: graphNetworkEnabled
    ? createGraphNetworkClient('GF6Ez7sY2gef8EoXrR76X6iFa41wf38zh4TXZkDkL5Z9')
    : createGraphHostedServiceClient('fionnachan/arb-bridge-eth-sepolia')
}

export function getL1SubgraphClient(l2ChainId: number) {
  switch (l2ChainId) {
    case ChainId.ArbitrumOne:
      return L1SubgraphClient.ArbitrumOne

    case ChainId.ArbitrumNova:
      return L1SubgraphClient.ArbitrumNova

    case ChainId.ArbitrumSepolia:
      return L1SubgraphClient.ArbitrumSepolia

    default:
      throw new Error(`[getL1SubgraphClient] unsupported chain: ${l2ChainId}`)
  }
}

// L2 Subgraphs

const L2SubgraphClient = {
  // mainnet
  // note that arbitrum nova is not supported
  ArbitrumOne: graphNetworkEnabled
    ? createGraphNetworkClient('9eFk14Tms68qBN7YwL6kFuk9e2BVRqkX6gXyjzLR3tuj')
    : createGraphHostedServiceClient('gvladika/layer2-token-gateway-arb1'),
  // testnet
  ArbitrumSepolia: graphNetworkEnabled
    ? createGraphNetworkClient('AaUuKWWuQbCXbvRkXpVDEpw9B7oVicYrovNyMLPZtLPw')
    : createGraphHostedServiceClient('fionnachan/layer2-token-gateway-sepolia')
}

export function getL2SubgraphClient(l2ChainId: number) {
  switch (l2ChainId) {
    case ChainId.ArbitrumOne:
      return L2SubgraphClient.ArbitrumOne

    case ChainId.ArbitrumSepolia:
      return L2SubgraphClient.ArbitrumSepolia

    default:
      throw new Error(`[getL2SubgraphClient] unsupported chain: ${l2ChainId}`)
  }
}
