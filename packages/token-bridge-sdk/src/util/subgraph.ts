import fetch from 'cross-fetch'
import { ApolloClient, HttpLink, InMemoryCache, gql } from '@apollo/client'

const L1SubgraphClient = {
  ArbitrumOne: new ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/gvladika/arb-bridge-eth-nitro',
    cache: new InMemoryCache()
  }),
  ArbitrumNova: new ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/gvladika/arb-bridge-eth-nova',
    cache: new InMemoryCache()
  }),
  ArbitrumGoerli: new ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/gvladika/arb-bridge-eth-goerli',
    cache: new InMemoryCache()
  })
}

const L2SubgraphClient = {
  ArbitrumOne: new ApolloClient({
    link: new HttpLink({
      uri: 'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway-arb1',
      fetch
    }),
    cache: new InMemoryCache()
  }),
  ArbitrumGoerli: new ApolloClient({
    link: new HttpLink({
      uri: 'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway-nitro-goerli',
      fetch
    }),
    cache: new InMemoryCache()
  })
}

export function getL1SubgraphClient(l2ChainId: number) {
  switch (l2ChainId) {
    case 42161:
      return L1SubgraphClient.ArbitrumOne

    case 42170:
      return L1SubgraphClient.ArbitrumNova

    case 421613:
      return L1SubgraphClient.ArbitrumGoerli

    default:
      throw new Error(`[getL1SubgraphClient] Unsupported network: ${l2ChainId}`)
  }
}

export function getL2SubgraphClient(l2ChainId: number) {
  switch (l2ChainId) {
    case 42161:
      return L2SubgraphClient.ArbitrumOne

    case 421613:
      return L2SubgraphClient.ArbitrumGoerli

    default:
      throw new Error(`[getL2SubgraphClient] Unsupported network: ${l2ChainId}`)
  }
}

// TODO: Codegen types
type FetchL2BlockNumberFromSubgraphQueryResult = {
  data: {
    _meta: {
      block: {
        number: number
      }
    }
  }
}

export async function fetchL2BlockNumberFromSubgraph(
  l2ChainId: number
): Promise<number> {
  const queryResult: FetchL2BlockNumberFromSubgraphQueryResult =
    await getL2SubgraphClient(l2ChainId).query({
      query: gql`
        {
          _meta {
            block {
              number
            }
          }
        }
      `
    })

  return queryResult.data._meta.block.number
}
