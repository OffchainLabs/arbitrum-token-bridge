import fetch from 'cross-fetch'
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'

import { ChainId } from './networks'
import { getAPIBaseUrl } from '.'

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

export const fetchLatestSubgraphBlockNumber = async (
  chainId: number
): Promise<number> => {
  const response = await fetch(
    `${getAPIBaseUrl()}/api/chains/${chainId}/block-number`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  )

  return ((await response.json()) as { data: number }).data
}

export const shouldIncludeSentTxs = ({
  type,
  isSmartContractWallet,
  isConnectedToParentChain
}: {
  type: 'deposits' | 'withdrawals'
  isSmartContractWallet: boolean
  isConnectedToParentChain: boolean
}) => {
  if (isSmartContractWallet) {
    // show txs sent from this account for:
    // 1. deposits if we are connected to the parent chain, or
    // 2. withdrawals if we are connected to the child chain
    return isConnectedToParentChain
      ? type === 'deposits'
      : type === 'withdrawals'
  }
  // always show for EOA
  return true
}

export const shouldIncludeReceivedTxs = ({
  type,
  isSmartContractWallet,
  isConnectedToParentChain
}: {
  type: 'deposits' | 'withdrawals'
  isSmartContractWallet: boolean
  isConnectedToParentChain: boolean
}) => {
  if (isSmartContractWallet) {
    // show txs sent to this account for:
    // 1. withdrawals if we are connected to the parent chain, or
    // 2. deposits if we are connected to the child chain
    return isConnectedToParentChain
      ? type === 'withdrawals'
      : type === 'deposits'
  }
  // always show for EOA
  return true
}
