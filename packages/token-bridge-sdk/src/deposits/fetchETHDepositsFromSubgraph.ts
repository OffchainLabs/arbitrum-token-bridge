import { gql } from '@apollo/client'
// import { BigNumber } from '@ethersproject/bignumber'
// import { Provider } from '@ethersproject/providers'

import { L1SubgraphClient } from '../util/subgraph'

type DepositETHSubgraphResult = {
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
 * @param query.l2Provider Provider for the L2 network
 */
export async function fetchETHDepositsFromSubgraph({
  address,
  fromTimeStamp,
  toTimeStamp
}: {
  address: string
  fromTimeStamp: number
  toTimeStamp: number
}): Promise<DepositETHSubgraphResult[]> {
  if (fromTimeStamp === 0 && toTimeStamp === 0) {
    return []
  }

  const res = await L1SubgraphClient.ArbitrumOne.query({
    query: gql`
      {
        ethDeposits(
          where: {
            senderAliased: "${address}",
            blockCreatedAt_gte: ${fromTimeStamp},
            blockCreatedAt_lte: ${toTimeStamp}
          }
          orderBy: blockCreatedAt
          orderDirection: desc
        ) {
          id
          senderAliased
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
      senderAliased,
      destAddr,
      value,
      msgData,
      transactionHash,
      blockCreatedAt
    } = eventData

    return {
      id,
      senderAliased,
      destAddr,
      value,
      msgData,
      transactionHash,
      blockCreatedAt
    }
  })
}
