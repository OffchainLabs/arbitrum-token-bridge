import { gql } from '@apollo/client'
import { BigNumber } from '@ethersproject/bignumber'

import { getL2SubgraphClient } from './graph'
import { L2ToL1EventResult } from '../hooks/arbTokenBridge.types'

/**
 * Fetches initiated ETH withdrawals from subgraph in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.address Account address
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2NetworkId Chain id for the corresponding L2 network
 */
export async function fetchETHWithdrawalsFromSubgraph({
  address,
  fromBlock,
  toBlock,
  l2NetworkId
}: {
  address: string
  fromBlock: number
  toBlock: number
  l2NetworkId: number
}): Promise<(L2ToL1EventResult & { l2TxHash: string })[]> {
  if (fromBlock === 0 && toBlock === 0) {
    return []
  }

  const res = await getL2SubgraphClient(l2NetworkId).query({
    query: gql`{
      l2ToL1Transactions(
        where: {
          l2From: "${address}",
          l2BlockNum_gte: ${fromBlock},
          l2BlockNum_lte: ${toBlock}
        }
        orderBy: l2Timestamp
        orderDirection: desc
      ) {
        uniqueId
        l2TxHash
        l2From
        l1To
        batchNumber
        indexInBatch
        l2BlockNum
        l1BlockNum
        l2Timestamp
        l1Callvalue
      }
    }`
  })

  return res.data.l2ToL1Transactions.map((eventData: any) => {
    const {
      uniqueId,
      l2TxHash,
      l2From,
      l1To,
      batchNumber: optionalBatchNumber,
      indexInBatch,
      l2BlockNum,
      l1BlockNum,
      l2Timestamp,
      l1Callvalue,
      l1Calldata
    } = eventData

    const batchNumber =
      optionalBatchNumber !== null
        ? BigNumber.from(optionalBatchNumber)
        : undefined

    return {
      uniqueId: BigNumber.from(uniqueId),
      l2TxHash,
      caller: l2From,
      destination: l1To,
      batchNumber,
      indexInBatch: BigNumber.from(indexInBatch),
      arbBlockNum: BigNumber.from(l2BlockNum),
      ethBlockNum: BigNumber.from(l1BlockNum),
      timestamp: l2Timestamp,
      callvalue: BigNumber.from(l1Callvalue),
      data: l1Calldata
    }
  })
}
