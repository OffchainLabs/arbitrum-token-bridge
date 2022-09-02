import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { BigNumber } from '@ethersproject/bignumber'
import { AssetType, L2ToL1EventResult } from '../hooks/arbTokenBridge.types'
import { utils } from 'ethers'

export type GetTokenWithdrawalsResult = {
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
        where: {caller:"${callerAddress}", data: "0x", arbBlockNum_gte: ${fromBlock}, arbBlockNum_lte:${toBlock}}
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

export const getTokenWithdrawals = async (
  sender: string,
  fromBlock: number,
  toBlock: number,
  l1NetworkID: string
): Promise<GetTokenWithdrawalsResult[]> => {
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
        where: { from:"${sender}", l2BlockNum_gte: ${fromBlock}, l2BlockNum_lte: ${toBlock}}
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
  return (
    res.data.withdrawals
      // Filter out badly indexed Nitro events
      .filter((eventData: any) => eventData.l2ToL1Event !== null)
      .map((eventData: any) => {
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
  )
}
