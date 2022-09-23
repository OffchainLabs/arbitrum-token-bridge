import { ApolloClient, InMemoryCache } from '@apollo/client'

const rinkebyL2SubgraphClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway-nitro-rinkeby',
  cache: new InMemoryCache()
})

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
