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
