import { Provider } from '@ethersproject/providers'

import { fetchETHWithdrawalsFromEventLogs } from './fetchETHWithdrawalsFromEventLogs'

import {
  mapETHWithdrawalToL2ToL1EventResult,
  mapTokenWithdrawalFromEventLogsToL2ToL1EventResult,
  mapWithdrawalToL2ToL1EventResult,
  updateAdditionalWithdrawalData
} from './helpers'
import { fetchWithdrawalsFromSubgraph } from './fetchWithdrawalsFromSubgraph'
import { tryFetchLatestSubgraphBlockNumber } from '../SubgraphUtils'
import { L2ToL1EventResultPlus } from 'token-bridge-sdk'
import { fetchTokenWithdrawalsFromEventLogs } from './fetchTokenWithdrawalsFromEventLogs'

export type FetchWithdrawalsParams = {
  walletAddress: string
  fromBlock?: number
  toBlock?: number
  l1Provider: Provider
  l2Provider: Provider
  gatewayAddresses: string[]
  pageNumber?: number
  pageSize?: number
  searchString?: string
}

/* Fetch complete withdrawals - both ETH and Token withdrawals from subgraph and event logs into one list */
/* Also fills in any additional data required per transaction for our UI logic to work well */
export const fetchWithdrawals = async ({
  walletAddress, // wallet address
  l1Provider,
  l2Provider,
  gatewayAddresses,
  pageNumber = 0,
  pageSize,
  searchString,
  fromBlock,
  toBlock
}: FetchWithdrawalsParams) => {
  if (!walletAddress || !l1Provider || !l2Provider) return []

  const l2ChainID = (await l2Provider.getNetwork()).chainId

  if (!fromBlock) {
    fromBlock = 0
  }

  if (!toBlock) {
    // if toBlock hasn't been provided by the user

    // fetch the latest L2 block number thorough subgraph
    const latestSubgraphBlockNumber = await tryFetchLatestSubgraphBlockNumber(
      'L2',
      l2ChainID
    )
    toBlock = latestSubgraphBlockNumber
  }

  const [
    withdrawalsFromSubgraph,
    ethWithdrawalsFromEventLogs,
    tokenWithdrawalsFromEventLogs
  ] = await Promise.all([
    fetchWithdrawalsFromSubgraph({
      address: walletAddress,
      fromBlock: fromBlock,
      toBlock: toBlock,
      l2ChainId: l2ChainID,
      pageNumber,
      pageSize,
      searchString
    }),
    fetchETHWithdrawalsFromEventLogs({
      address: walletAddress,
      fromBlock: toBlock + 1,
      toBlock: 'latest',
      l2Provider: l2Provider
    }),
    fetchTokenWithdrawalsFromEventLogs({
      address: walletAddress,
      fromBlock: toBlock + 1,
      toBlock: 'latest',
      l2Provider: l2Provider,
      l2GatewayAddresses: gatewayAddresses
    })
  ])

  const l2ToL1Txns = (
    await Promise.all([
      ...withdrawalsFromSubgraph.map(withdrawal =>
        mapWithdrawalToL2ToL1EventResult(
          withdrawal,
          l1Provider,
          l2Provider,
          l2ChainID
        )
      ),
      ...ethWithdrawalsFromEventLogs.map(withdrawal =>
        mapETHWithdrawalToL2ToL1EventResult(
          withdrawal,
          l1Provider,
          l2Provider,
          l2ChainID
        )
      ),
      ...tokenWithdrawalsFromEventLogs.map(withdrawal =>
        mapTokenWithdrawalFromEventLogsToL2ToL1EventResult(
          withdrawal,
          l1Provider,
          l2Provider,
          l2ChainID,
          walletAddress
        )
      )
    ])
  )
    .filter((msg): msg is L2ToL1EventResultPlus => typeof msg !== 'undefined')
    .sort((msgA, msgB) => +msgA.timestamp - +msgB.timestamp)

  const finalL2ToL1Txns: L2ToL1EventResultPlus[] = await Promise.all(
    l2ToL1Txns.map(withdrawal =>
      updateAdditionalWithdrawalData(withdrawal, l1Provider, l2Provider)
    )
  )

  return finalL2ToL1Txns
}
