import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'

function createSubgraphClient(subgraph: string) {
  return new ApolloClient({
    link: new HttpLink({
      uri: `${process.env.SUBGRAPH_BASE_URL}/${subgraph}/version/latest`,
      fetch
    }),
    cache: new InMemoryCache()
  })
}

export const CctpSubgraphClient = {
  // mainnet
  Ethereum: createSubgraphClient('cctp-ethereum'),
  ArbitrumOne: createSubgraphClient('cctp-arb-one'),
  // testnet
  Sepolia: createSubgraphClient('cctp-sepolia'),
  ArbitrumSepolia: createSubgraphClient('cctp-arb-sep')
}
