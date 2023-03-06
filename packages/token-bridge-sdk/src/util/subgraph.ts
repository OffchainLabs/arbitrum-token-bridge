import fetch from 'cross-fetch'
import { ApolloClient, HttpLink, InMemoryCache, gql } from '@apollo/client'

const L1SubgraphClient = {
  ArbitrumOne: new ApolloClient({
    link: new HttpLink({
      uri: 'https://api.thegraph.com/subgraphs/name/gvladika/arb-bridge-eth-nitro',
      fetch
    }),
    cache: new InMemoryCache()
  }),
  ArbitrumNova: new ApolloClient({
    link: new HttpLink({
      uri: 'https://api.thegraph.com/subgraphs/name/gvladika/arb-bridge-eth-nova',
      fetch
    }),
    cache: new InMemoryCache()
  }),
  ArbitrumGoerli: new ApolloClient({
    link: new HttpLink({
      uri: 'https://api.thegraph.com/subgraphs/name/gvladika/arb-bridge-eth-goerli',
      fetch
    }),
    cache: new InMemoryCache()
  })
}

const L2SubgraphClient = {
  ArbitrumOne: new ApolloClient({
    link: new HttpLink({
      uri: 'https://api.thegraph.com/subgraphs/name/gvladika/layer2-token-gateway-arb1',
      fetch
    }),
    cache: new InMemoryCache()
  }),
  ArbitrumGoerli: new ApolloClient({
    link: new HttpLink({
      uri: 'https://api.thegraph.com/subgraphs/name/gvladika/layer2-token-gateway-goerli',
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
type FetchBlockNumberFromSubgraphQueryResult = {
  data: {
    _meta: {
      block: {
        number: number
      }
    }
  }
}

export const fetchBlockNumberFromSubgraph = async (
  chainType: 'L1' | 'L2',
  l2ChainId: number
): Promise<number> => {
  const queryResult: FetchBlockNumberFromSubgraphQueryResult =
    await (chainType === 'L2' ? getL2SubgraphClient : getL1SubgraphClient)(
      l2ChainId
    ).query({
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

export const tryFetchLatestSubgraphBlockNumber = async (
  chainType: 'L1' | 'L2',
  l2ChainID: number
): Promise<number> => {
  try {
    return await fetchBlockNumberFromSubgraph(chainType, l2ChainID)
  } catch (error) {
    // In case the subgraph is not supported or down, fall back to fetching everything through event logs
    return 0
  }
}
