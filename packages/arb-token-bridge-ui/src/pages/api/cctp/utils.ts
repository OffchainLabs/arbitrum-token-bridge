import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'
import { NextApiRequest } from 'next'
import { ChainId } from '../../../util/networks'

export function getSubgraphClient(subgraph: string) {
  return new ApolloClient({
    link: new HttpLink({
      uri: `https://api.thegraph.com/subgraphs/name/chrstph-dvx/${subgraph}`,
      fetch
    }),
    cache: new InMemoryCache()
  })
}

// Extending the standard NextJs request with CCTP params
export type NextApiRequestWithCCTPParams = NextApiRequest & {
  query: {
    address: `0x${string}`
    l1ChainId: ChainId
  }
}

export type MessageReceived = {
  blockNumber: number
  blockTimestamp: number
  caller: `0x${string}`
  id: string
  messageBody: string
  nonce: number
  sender: `0x${string}`
  sourceDomain: 0 | 1 // 0: Mainnet, 1: Avalanche
  transactionHash: `0x${string}`
}

export type MessageSent = {
  attestationHash: `0x${string}`
  blockNumber: number
  blockTimestamp: number
  id: string
  message: string
  nonce: number
  sender: `0x${string}`
  sourceDomain: 0 | 1 // 0: Mainnet, 1: Avalanche
  transactionHash: `0x${string}`
}

export type Response =
  | {
      data: {
        messageSents: MessageSent[]
        messageReceiveds: MessageReceived[]
      }
    }
  | {
      data: null
      message: string // in case of any error
    }
