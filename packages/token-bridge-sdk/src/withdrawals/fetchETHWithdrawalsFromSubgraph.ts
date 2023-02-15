import { gql } from '@apollo/client'
import { BigNumber } from '@ethersproject/bignumber'
import { Provider } from '@ethersproject/providers'

import { getL2SubgraphClient } from '../util/subgraph'
import { L2ToL1EventResult } from '../hooks/arbTokenBridge.types'

/**
 * Fetches initiated withdrawals (ETH only) from subgraph in range of [fromBlock, toBlock] and pageParams.
 *
 * @param query Query params
 * @param query.address Account address
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2Provider Provider for the L2 network
 * @param query.pageSize Fetch these many records from subgraph
 * @param query.pageNumber Fetch records starting [pageNumber * pageSize] records
 * @param query.searchString Searches records through the l2TxHash
 */
export async function fetchETHWithdrawalsFromSubgraph({
  address,
  fromBlock,
  toBlock,
  l2Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: {
  address: string
  fromBlock: number
  toBlock: number
  l2Provider: Provider
  pageSize?: number
  pageNumber?: number
  searchString?: string
}): Promise<(L2ToL1EventResult & { l2TxHash: string })[]> {
  if (
    typeof fromBlock !== 'undefined' &&
    typeof toBlock !== 'undefined' &&
    fromBlock >= toBlock
  ) {
    // if fromBlock > toBlock or both are equal / 0
    return []
  }

  const l2ChainId = (await l2Provider.getNetwork()).chainId

  const res = await getL2SubgraphClient(l2ChainId).query({
    query: gql`{
      l2ToL1Transactions(
        where: {
          l2From: "${address}",
          l2BlockNum_gte: ${fromBlock},
          l2BlockNum_lte: ${toBlock},
          ${searchString ? `l2TxHash_contains: "${searchString}"` : ''}
        }
        orderBy: l2Timestamp
        orderDirection: desc
        first: ${pageSize},
        skip: ${pageNumber * pageSize}
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
        isClassic
      }
    }`
  })

  return res.data.l2ToL1Transactions.map((eventData: any) => {
    const {
      uniqueId: uniqueIdStr,
      l2TxHash,
      l2From,
      l1To,
      batchNumber: maybeBatchNumber,
      indexInBatch: indexInBatchStr,
      l2BlockNum,
      l1BlockNum,
      l2Timestamp,
      l1Callvalue,
      l1Calldata,
      isClassic
    } = eventData

    const batchNumber = isClassic ? BigNumber.from(maybeBatchNumber) : undefined
    const indexInBatch = isClassic ? BigNumber.from(indexInBatchStr) : undefined

    // `position` is in the `indexInBatch` property for Nitro
    // `hash` is in the `uniqueId` property for Nitro
    //
    // https://github.com/OffchainLabs/arbitrum-subgraphs/blob/nitro-support/packages/layer2-token-gateway/schema.graphql#L101
    const position = isClassic ? undefined : BigNumber.from(indexInBatchStr)
    const hash = isClassic ? undefined : BigNumber.from(uniqueIdStr)

    return {
      uniqueId: BigNumber.from(uniqueIdStr),
      hash,
      l2TxHash,
      caller: l2From,
      destination: l1To,
      batchNumber,
      indexInBatch,
      position,
      arbBlockNum: BigNumber.from(l2BlockNum),
      ethBlockNum: BigNumber.from(l1BlockNum),
      timestamp: l2Timestamp,
      callvalue: BigNumber.from(l1Callvalue),
      data: l1Calldata ?? '0x'
    }
  })
}
