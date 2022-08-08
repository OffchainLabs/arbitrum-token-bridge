import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { BigNumber } from '@ethersproject/bignumber'
import { AssetType, L2ToL1EventResult } from '../hooks/arbTokenBridge.types'
import axios from 'axios'
import { utils } from 'ethers'

export interface NodeDataResult {
  afterSendCount: string
  timestampCreated: string
  blockCreatedAt: string
  id: string // hex
}

interface GetTokenWithdrawalsResult {
  l2ToL1Event: L2ToL1EventResult & { l2TxHash: string }
  otherData: {
    value: BigNumber
    tokenAddress: string
    type: AssetType
  }
}

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

const apolloL2GatewaysRinkebyClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway-rinkeby',
  cache: new InMemoryCache()
})

const apolloL2GatewaysClient = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/fredlacs/layer2-token-gateway',
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

export const getNodes = async (
  networkID: string,
  minAfterSendCount = 0,
  offset = 0
): Promise<NodeDataResult[]> => {
  const client = networkIDAndLayerToClient(networkID, 1)
  const res = await client.query({
    query: gql`
    {
      nodes(
        orderBy: afterSendCount
        orderDirection: asc
        where:{ afterSendCount_gte: ${minAfterSendCount}}
        first: 1000,
        skip: ${offset}

      ){
        afterSendCount,
        timestampCreated,
        blockCreatedAt,
        id
      }
    }
    `
  })
  const nodes = res.data.nodes as NodeDataResult[]
  if (nodes.length === 0) {
    return nodes
  } else {
    return nodes.concat(
      await getNodes(networkID, minAfterSendCount, offset + nodes.length)
    )
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
  return res.data.outboxEntries?.[0]?.outboxEntryIndex as number
}

export const getETHWithdrawals = async (
  callerAddress: string,
  fromBlock: number,
  toBlock: number,
  networkID: string
): Promise<(L2ToL1EventResult & { l2TxHash: string })[]> => {
  const client = networkIDAndLayerToClient(networkID, 2)
  const res = await client.query({
    query: gql`{
      l2ToL1Transactions(
        where: {caller:"${callerAddress}", data: "0x", arbBlockNum_gte: ${fromBlock}, arbBlockNum_lt:${toBlock}}
        orderBy: timestamp
        orderDirection: desc
        ) {
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
      id,
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

    const l2ToL1Event = {
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

    return { ...l2ToL1Event, l2TxHash: id.split('-')[0] }
  })
}

export const messageHasExecuted = async (
  path: BigNumber,
  batchNumber: BigNumber,
  networkID: string
) => {
  const client = networkIDAndLayerToClient(networkID, 1)
  const batchHexString = utils.hexStripZeros(batchNumber.toHexString())
  const res = await client.query({
    query: gql`{
      outboxOutputs(where: {path:${path.toNumber()}, outboxEntry:"${batchHexString}", spent:true }) {
        id,
      }
    }`
  })
  return res.data.outboxOutputs.length > 0
}

export const getTokenWithdrawals = async (
  sender: string,
  fromBlock: number,
  toBlock: number,
  l1NetworkID: string
): Promise<GetTokenWithdrawalsResult[]> => {
  if (fromBlock === 0 && toBlock === 0) {
    return []
  }

  const client = ((l1NetworkID: string) => {
    switch (l1NetworkID) {
      case '1':
        return apolloL2GatewaysClient
      case '4':
        return apolloL2GatewaysRinkebyClient
      default:
        throw new Error('Unsupported network')
    }
  })(l1NetworkID)

  const res = await client.query({
    query: gql`{
      withdrawals(
        where: { from:"${sender}", l2BlockNum_gte: ${fromBlock}, l2BlockNum_lt: ${toBlock}}
        orderBy: l2BlockNum
        orderDirection: desc
      ) {
        l2ToL1Event {
          l2TxHash,
          id,
          caller,
          destination,
          batchNumber,
          indexInBatch,
          arbBlockNum,
          ethBlockNum,
          timestamp,
          callvalue,
          data
        },
        amount
      }
    }
    `
  })
  return res.data.withdrawals.map((eventData: any) => {
    const {
      amount: value,
      l2ToL1Event: {
        l2TxHash,
        id,
        caller,
        destination,
        batchNumber,
        indexInBatch,
        arbBlockNum,
        ethBlockNum,
        timestamp,
        callvalue,
        data
      }
    } = eventData
    const l2ToL1Event = {
      destination,
      timestamp,
      data,
      caller,
      uniqueId: BigNumber.from(id),
      batchNumber: BigNumber.from(batchNumber),
      indexInBatch: BigNumber.from(indexInBatch),
      arbBlockNum: BigNumber.from(arbBlockNum),
      ethBlockNum: BigNumber.from(ethBlockNum),
      callvalue: BigNumber.from(callvalue)
    } as L2ToL1EventResult
    const tokenAddress = utils.hexDataSlice(data, 16, 36)
    return {
      l2ToL1Event: { ...l2ToL1Event, l2TxHash },
      otherData: {
        value: BigNumber.from(value),
        tokenAddress,
        type: AssetType.ERC20
      }
    }
  })
}

const getLatestIndexedBlockNumber = async (subgraphName: string) => {
  try {
    const res = await axios.post(
      'https://api.thegraph.com/index-node/graphql',
      {
        query: `{ indexingStatusForCurrentVersion(subgraphName: "${subgraphName}") {  chains { network latestBlock { number }  } } }`
      }
    )
    return res.data.data.indexingStatusForCurrentVersion.chains[0].latestBlock
      .number
  } catch (err) {
    console.warn('Error getting graph status:', err)

    return 0
  }
}

const getLatestIndexedBlockNumberUsingMeta = async (subgraphName: string) => {
  try {
    const res = await axios.post(
      'https://api.thegraph.com/subgraphs/name/' + subgraphName,
      {
        query: `{ _meta { block { number } } }`
      }
    )
    return res.data.data._meta.block.number
  } catch (err) {
    console.warn('Error getting graph status:', err)

    return 0
  }
}

export const getBuiltInsGraphLatestBlockNumber = (l1NetworkID: string) => {
  const subgraphName = ((l1NetworkID: string) => {
    switch (l1NetworkID) {
      case '1':
        return 'fredlacs/arb-builtins'
      case '4':
        return 'fredlacs/arb-builtins-rinkeby'
      default:
        throw new Error('Unsupported netwowk')
    }
  })(l1NetworkID)

  return getLatestIndexedBlockNumberUsingMeta(subgraphName)
}

export const getL2GatewayGraphLatestBlockNumber = (l1NetworkID: string) => {
  // TODO: Revert hardcoded value
  if (l1NetworkID === '4') {
    return 0
  }

  const subgraphName = ((l1NetworkID: string) => {
    switch (l1NetworkID) {
      case '1':
        return 'fredlacs/layer2-token-gateway'
      case '4':
        return 'fredlacs/layer2-token-gateway-rinkeby'
      default:
        throw new Error('Unsupported netwowk')
    }
  })(l1NetworkID)

  return getLatestIndexedBlockNumberUsingMeta(subgraphName)
}
