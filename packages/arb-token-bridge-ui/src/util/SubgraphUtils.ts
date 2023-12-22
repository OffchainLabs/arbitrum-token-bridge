import fetch from 'cross-fetch'
import { ApolloClient, HttpLink, InMemoryCache, gql } from '@apollo/client'
import { ChainId } from './networks'

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
  }),
  ArbitrumSepolia: new ApolloClient({
    link: new HttpLink({
      uri: 'https://api.thegraph.com/subgraphs/name/fionnachan/arb-bridge-eth-sepolia',
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
  // ArbitrumNova is unavailable because Subgraph does not support Arbitrum Nova network
  ArbitrumGoerli: new ApolloClient({
    link: new HttpLink({
      uri: 'https://api.thegraph.com/subgraphs/name/gvladika/layer2-token-gateway-goerli',
      fetch
    }),
    cache: new InMemoryCache()
  }),
  ArbitrumSepolia: new ApolloClient({
    link: new HttpLink({
      uri: 'https://api.thegraph.com/subgraphs/name/fionnachan/layer2-token-gateway-sepolia',
      fetch
    }),
    cache: new InMemoryCache()
  })
}

export function getL1SubgraphClient(l2ChainId: number) {
  switch (l2ChainId) {
    case ChainId.ArbitrumOne:
      return L1SubgraphClient.ArbitrumOne

    case ChainId.ArbitrumNova:
      return L1SubgraphClient.ArbitrumNova

    case ChainId.ArbitrumGoerli:
      return L1SubgraphClient.ArbitrumGoerli

    case ChainId.ArbitrumSepolia:
      return L1SubgraphClient.ArbitrumSepolia

    default:
      throw new Error(`[getL1SubgraphClient] Unsupported network: ${l2ChainId}`)
  }
}

export function getL2SubgraphClient(l2ChainId: number) {
  switch (l2ChainId) {
    case ChainId.ArbitrumOne:
      return L2SubgraphClient.ArbitrumOne

    case ChainId.ArbitrumGoerli:
      return L2SubgraphClient.ArbitrumGoerli

    case ChainId.ArbitrumSepolia:
      return L2SubgraphClient.ArbitrumSepolia

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
  const subgraphClient =
    chainType === 'L2'
      ? getL2SubgraphClient(l2ChainId)
      : getL1SubgraphClient(l2ChainId)

  const queryResult: FetchBlockNumberFromSubgraphQueryResult =
    await subgraphClient.query({
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

export const shouldIncludeSentTxs = ({
  type,
  isSmartContractWallet,
  isConnectedToParentChain
}: {
  type: 'deposit' | 'withdrawal'
  isSmartContractWallet: boolean
  isConnectedToParentChain: boolean
}) => {
  if (isSmartContractWallet) {
    // show txs sent from this account for:
    // 1. deposits if we are connected to the parent chain, or
    // 2. withdrawals if we are connected to the child chain
    return isConnectedToParentChain ? type === 'deposit' : type === 'withdrawal'
  }
  // always show for EOA
  return true
}

export const shouldIncludeReceivedTxs = ({
  type,
  isSmartContractWallet,
  isConnectedToParentChain
}: {
  type: 'deposit' | 'withdrawal'
  isSmartContractWallet: boolean
  isConnectedToParentChain: boolean
}) => {
  if (isSmartContractWallet) {
    // show txs sent to this account for:
    // 1. withdrawals if we are connected to the parent chain, or
    // 2. deposits if we are connected to the child chain
    return isConnectedToParentChain ? type === 'withdrawal' : type === 'deposit'
  }
  // always show for EOA
  return true
}
