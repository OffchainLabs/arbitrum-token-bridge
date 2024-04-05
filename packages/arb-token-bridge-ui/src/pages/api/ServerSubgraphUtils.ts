import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'

import { ChainId } from '../../util/networks'

function createClient(subgraphId: string) {
  return new ApolloClient({
    link: new HttpLink({
      uri: `https://gateway-arbitrum.network.thegraph.com/api/${process.env.SUBGRAPH_API_KEY}/subgraphs/id/${subgraphId}`,
      fetch
    }),
    cache: new InMemoryCache()
  })
}

// CCTP Subgraphs

const CctpSubgraphClient = {
  // mainnet
  Ethereum: createClient('E6iPLnDGEgrcc4gu9uiHJxENSRAAzTvUJqQqJcHZqJT1'),
  ArbitrumOne: createClient('9DgSggKVrvfi4vdyYTdmSBuPgDfm3D7zfLZ1qaQFjYYW'),
  // testnet
  Sepolia: createClient('4gSU1PTxjYPWk2TXPX2fusjuXrBFHC7kCZrbhrhaF9V5'),
  ArbitrumSepolia: createClient('4Dp9ENSFDKfeBsmZeSyATKKrhxC2EKzbC3bZvTHpU1DB')
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
  ArbitrumOne: createClient('F2N4nGH86Y5Bk2vPo15EVRSTz2wbtz7BGRe8DDJqMPG4'),
  ArbitrumNova: createClient('6Xvyjk9r91N3DSRQP6UZ1Lkbou567hFxLSWt2Tsv5AWp'),
  // testnet
  ArbitrumSepolia: createClient('GF6Ez7sY2gef8EoXrR76X6iFa41wf38zh4TXZkDkL5Z9')
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
  ArbitrumOne: createClient('9eFk14Tms68qBN7YwL6kFuk9e2BVRqkX6gXyjzLR3tuj'),
  // testnet
  ArbitrumSepolia: createClient('AaUuKWWuQbCXbvRkXpVDEpw9B7oVicYrovNyMLPZtLPw')
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
