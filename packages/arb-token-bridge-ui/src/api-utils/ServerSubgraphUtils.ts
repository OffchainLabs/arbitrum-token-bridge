import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject
} from '@apollo/client'
import ApolloLinkTimeout from 'apollo-link-timeout'

import { ChainId } from '../types/ChainId'

/**
 * The API key to be used for calls to The Graph Network.
 */
const theGraphNetworkApiKey = process.env.THE_GRAPH_NETWORK_API_KEY

const selfHostedSubgraphApiKey = process.env.SELF_HOSTED_SUBGRAPH_API_KEY

type SubgraphKey = keyof typeof subgraphs

type TheGraphNetworkSubgraphId =
  (typeof subgraphs)[SubgraphKey]['theGraphNetworkSubgraphId']

const subgraphs = {
  // CCTP Mainnet Subgraphs
  'cctp-ethereum': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: 'E6iPLnDGEgrcc4gu9uiHJxENSRAAzTvUJqQqJcHZqJT1'
  },
  'cctp-arbitrum-one': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: '9DgSggKVrvfi4vdyYTdmSBuPgDfm3D7zfLZ1qaQFjYYW'
  },
  // CCTP Testnet Subgraphs
  'cctp-sepolia': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: '4gSU1PTxjYPWk2TXPX2fusjuXrBFHC7kCZrbhrhaF9V5'
  },
  'cctp-arbitrum-sepolia': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: '4Dp9ENSFDKfeBsmZeSyATKKrhxC2EKzbC3bZvTHpU1DB'
  },
  // L1 Mainnet Subgraphs
  'l1-arbitrum-one': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: 'F2N4nGH86Y5Bk2vPo15EVRSTz2wbtz7BGRe8DDJqMPG4'
  },
  'l1-arbitrum-nova': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: '6Xvyjk9r91N3DSRQP6UZ1Lkbou567hFxLSWt2Tsv5AWp'
  },
  // L1 Testnet Subgraphs
  'l1-arbitrum-sepolia': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: 'GF6Ez7sY2gef8EoXrR76X6iFa41wf38zh4TXZkDkL5Z9'
  },
  // L2 Mainnet Subgraphs
  'l2-arbitrum-one': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: '9eFk14Tms68qBN7YwL6kFuk9e2BVRqkX6gXyjzLR3tuj'
  },
  // L2 Nova Subgraphs
  'l2-arbitrum-nova': {
    selfHostedSubgraph: 'arbitrum-nova/layer2-token-gateway',
    theGraphNetworkSubgraphId: ''
  },
  // L2 Testnet Subgraphs
  'l2-arbitrum-sepolia': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: 'AaUuKWWuQbCXbvRkXpVDEpw9B7oVicYrovNyMLPZtLPw'
  },
  // Teleport Sepolia
  'teleporter-sepolia': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: '6AwhH4JF8Ss5ZFf12azD13D1nNhuNzLnjH56irYqA7fD'
  },
  'teleporter-ethereum': {
    selfHostedSubgraph: '',
    theGraphNetworkSubgraphId: 'GEVHWg3FLKvWivMhqkeVrQVt4WCN6cWnsvdf6MpNrHpg'
  }
} as const

function createApolloClient(uri: string) {
  const timeoutLink = new ApolloLinkTimeout()
  const httpLink = timeoutLink.concat(new HttpLink({ uri, fetch }))

  return new ApolloClient({
    link: httpLink,
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

function createSubgraphClient(key: SubgraphKey) {
  console.log(`[createSubgraphClient] key=${key}`)

  const { theGraphNetworkSubgraphId, selfHostedSubgraph } = subgraphs[key]

  if (selfHostedSubgraph !== '') {
    return createSelfHostedSubgraphClient(selfHostedSubgraph)
  }

  console.log(
    `[createSubgraphClient] using subgraph "${theGraphNetworkSubgraphId}" on the graph network`
  )
  return createTheGraphNetworkClient(theGraphNetworkSubgraphId)
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
