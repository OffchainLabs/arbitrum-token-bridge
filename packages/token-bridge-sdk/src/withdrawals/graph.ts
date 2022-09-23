import { ApolloClient, InMemoryCache, gql } from '@apollo/client'

const rinkebyL2SubgraphClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway-nitro-rinkeby',
  cache: new InMemoryCache()
})

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

export function getL2SubgraphClient(l2NetworkId: number) {
  switch (l2NetworkId) {
    case 421611:
      return rinkebyL2SubgraphClient

    default:
      throw new Error(
        `[getL2SubgraphClient] Unsupported network: ${l2NetworkId}`
      )
  }
}
