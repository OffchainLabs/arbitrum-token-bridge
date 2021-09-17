import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  gql
} from '@apollo/client'
import { BigNumber } from '@ethersproject/bignumber'
import { L2ToL1EventResult } from 'arb-ts'

const apolloL1Mainnetlient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/fredlacs/arb-bridge-eth',
  cache: new InMemoryCache()
})

const apolloL2Mainnetlient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/fredlacs/arb-builtins',
  cache: new InMemoryCache()
})

const apolloL1RinkebyClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/fredlacs/arb-bridge-eth-rinkeby',
  cache: new InMemoryCache()
})

const apolloL2RinkebyClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/fredlacs/arb-builtins-rinkeby',
  cache: new InMemoryCache()
})

const networkIDAndLayerToClient = (networkID: string, layer: 1 | 2) => {
  switch (networkID) {
    case '1':
      return layer === 1 ? apolloL1Mainnetlient : apolloL2Mainnetlient
    case '4':
      return layer === 1 ? apolloL1RinkebyClient : apolloL2RinkebyClient
    default:
      throw new Error('Unsupported network')
  }
}

export const getLatestOutboxEntryIndex = async (networkID: string) => {
  const client = networkIDAndLayerToClient(networkID, 1)
  const res = await client.query({
    query: gql`
      {
        outboxEntries(
          orderBy: outboxEntryIndex
          orderDirection: desc
          first: 1
        ) {
          outboxEntryIndex
        }
      }
    `
  })
  return res.data.outboxEntryIndex as number
}

export const getETHWithdrawals = async (
  callerAddress: string,
  networkID: string
): Promise<L2ToL1EventResult[]> => {
  const client = networkIDAndLayerToClient(networkID, 2)
  const res = await client.query({
    query: gql`{
      l2ToL1Transactions(where: {caller:"${callerAddress}", data: "0x"}) {
        destination,
        timestamp,
        data,
        caller,
        id,
        uniqueId,
        batchNumber,
        indexInBatch,
        arbBlockNum,
        ethBlockNum,
        callvalue,
      }
    }`
  })
  return res.data.l2ToL1Transactions.map((eventData: any) => {
    const {
      destination,
      timestamp,
      data,
      caller,
      uniqueId,
      batchNumber,
      indexInBatch,
      arbBlockNum,
      ethBlockNum,
      callvalue
    } = eventData
    return {
      destination,
      timestamp,
      data,
      caller,
      uniqueId: BigNumber.from(uniqueId),
      batchNumber: BigNumber.from(batchNumber),
      indexInBatch: BigNumber.from(indexInBatch),
      arbBlockNum: BigNumber.from(arbBlockNum),
      ethBlockNum: BigNumber.from(ethBlockNum),
      callvalue: BigNumber.from(callvalue)
    } as L2ToL1EventResult
  })
}

export const messageHasExecuted = async (
  path: BigNumber,
  batchNumber: BigNumber,
  networkID: string
) => {
  const client = networkIDAndLayerToClient(networkID, 1)
  const res = await client.query({
    query: gql`{
      outboxOutputs(where: {path:${path.toNumber()}, outboxEntry:"${batchNumber.toHexString()}", spent:true }) {
        id,
      }
    }`
  })
  return res.data.length > 0
}
