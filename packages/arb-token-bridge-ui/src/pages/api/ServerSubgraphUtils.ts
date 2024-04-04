import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'

import { ChainId } from '../../util/networks'

function createSubgraphClient(subgraph: string) {
  return new ApolloClient({
    link: new HttpLink({
      uri: `${process.env.SUBGRAPH_BASE_URL}/${subgraph}/version/latest`,
      fetch
    }),
    cache: new InMemoryCache()
  })
}

// CCTP Subgraphs

const CctpSubgraphClient = {
  // mainnet
  Ethereum: createSubgraphClient('cctp-ethereum'),
  ArbitrumOne: createSubgraphClient('cctp-arb-one'),
  // testnet
  Sepolia: createSubgraphClient('cctp-sepolia'),
  ArbitrumSepolia: createSubgraphClient('cctp-arb-sep')
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
  ArbitrumOne: createSubgraphClient('arb-bridge-eth-arb-one'),
  ArbitrumNova: createSubgraphClient('arb-bridge-eth-arb-nova'),
  // testnet
  ArbitrumSepolia: createSubgraphClient('arb-bridge-eth-arb-sep')
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
  ArbitrumOne: createSubgraphClient('child-token-gateway-arb-one'),
  // testnet
  ArbitrumSepolia: createSubgraphClient('child-token-gateway-arb-sep')
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
