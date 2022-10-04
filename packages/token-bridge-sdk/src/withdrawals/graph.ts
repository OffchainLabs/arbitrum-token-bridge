import { ApolloClient, InMemoryCache, gql } from '@apollo/client'

const L2SubgraphClient = {
  ArbitrumOne: new ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway-arb1',
    cache: new InMemoryCache()
  }),
  ArbitrumRinkeby: new ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway-nitro-rinkeby',
    cache: new InMemoryCache()
  }),
  ArbitrumGoerli: new ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway-nitro-goerli',
    cache: new InMemoryCache()
  })
}

export function getL2SubgraphClient(l2NetworkId: number) {
  switch (l2NetworkId) {
    case 42161:
      return L2SubgraphClient.ArbitrumOne

    case 421611:
      return L2SubgraphClient.ArbitrumRinkeby

    case 421613:
      return L2SubgraphClient.ArbitrumGoerli

    default:
      throw new Error(
        `[getL2SubgraphClient] Unsupported network: ${l2NetworkId}`
      )
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
  l2NetworkId: number
): Promise<number> {
  const queryResult: FetchL2BlockNumberFromSubgraphQueryResult =
    await getL2SubgraphClient(l2NetworkId).query({
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
