import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { Provider } from '@ethersproject/providers'

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

export type DepositETHSubgraphResult = {
  id: string
  senderAliased: string
  destAddr: string
  value: string
  msgData: string
  transactionHash: string
  blockCreatedAt: string
}

/**
 * Fetches initiated ETH deposits from subgraph in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.address Account address
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l1Provider Provider for the L1 network
 */
export async function fetchETHDepositsFromSubgraph({
  address,
  fromBlock,
  toBlock,
  l2Provider
}: {
  address: string
  fromBlock: number
  toBlock: number
  l2Provider: Provider
}): Promise<DepositETHSubgraphResult[]> {
  const l2ChainId = (await l2Provider.getNetwork()).chainId

  if (fromBlock === 0 && toBlock === 0) {
    return []
  }

  const res = await getL1SubgraphClient(l2ChainId).query({
    query: gql`
      {
        ethDeposits(
          where: {
            sender: "${address}",
            blockCreatedAt_gte: ${fromBlock},
            blockCreatedAt_lte: ${toBlock}
          }
          orderBy: blockCreatedAt
          orderDirection: desc
          first: 10
        ) {
          id
          sender
          destAddr
          value
          msgData
          transactionHash
          blockCreatedAt
        }
      }
    `
  })

  return res.data.ethDeposits.map((eventData: any) => {
    const {
      id,
      sender,
      destAddr,
      value,
      msgData,
      transactionHash,
      blockCreatedAt
    } = eventData

    return {
      id,
      sender,
      destAddr,
      value,
      msgData,
      transactionHash,
      blockCreatedAt
    }
  })
}
