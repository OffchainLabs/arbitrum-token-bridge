import { fetchTokenWithdrawalsFromSubgraph } from './fetchTokenWithdrawalsFromSubgraph'
import { Provider } from '@ethersproject/providers'
import { fetchETHWithdrawalsFromSubgraph } from './fetchETHWithdrawalsFromSubgraph'
import { L2ToL1EventResultPlus } from '../hooks/arbTokenBridge.types'

import { fetchL2BlockNumberFromSubgraph } from '../util/subgraph'
import { fetchETHWithdrawalsFromEventLogs } from './fetchETHWithdrawalsFromEventLogs'
import { fetchTokenWithdrawalsFromEventLogs } from './fetchTokenWithdrawalsFromEventLogs'
import {
  mapETHWithdrawalToL2ToL1EventResult,
  mapTokenWithdrawalFromEventLogsToL2ToL1EventResult,
  mapWithdrawalToL2ToL1EventResult,
  tryFetchLatestSubgraphBlockNumber,
  updateAdditionalWithdrawalData
} from '../util/withdrawals'
import { fetchWithdrawalsFromSubgraph } from './fetchWithdrawalsFromSubgraph'

/* Fetch complete withdrawals - both ETH and Token withdrawals from subgraph and event logs into one list */
/* Also fills in any additional data required per transaction for our UI logic to work well */
export const fetchWithdrawals = async ({
  walletAddress, // wallet address
  l1Provider,
  l2Provider,
  gatewayAddresses,
  pageNumber = 0,
  pageSize,
  searchString
}: {
  walletAddress: string
  l1Provider: Provider
  l2Provider: Provider
  gatewayAddresses: string[]
  pageNumber?: number
  pageSize?: number
  searchString?: string
}) => {
  if (!walletAddress || !l1Provider || !l2Provider) return []

  const l1ChainID = (await l1Provider.getNetwork()).chainId
  const l2ChainID = (await l2Provider.getNetwork()).chainId

  const latestSubgraphBlockNumber = await tryFetchLatestSubgraphBlockNumber(
    l2ChainID
  )

  const [
    withdrawalsFromSubgraph,
    ethWithdrawalsFromEventLogs,
    tokenWithdrawalsFromEventLogs
  ] = await Promise.all([
    fetchWithdrawalsFromSubgraph({
      address: walletAddress,
      fromBlock: 0,
      toBlock: latestSubgraphBlockNumber,
      l2Provider: l2Provider,
      pageNumber,
      pageSize,
      searchString
    }),
    fetchETHWithdrawalsFromEventLogs({
      address: walletAddress,
      fromBlock: latestSubgraphBlockNumber + 1,
      toBlock: 'latest',
      l2Provider: l2Provider
    }),
    fetchTokenWithdrawalsFromEventLogs({
      address: walletAddress,
      fromBlock: latestSubgraphBlockNumber + 1,
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

  const finalL2ToL1Txns = await Promise.all(
    l2ToL1Txns.map(withdrawal =>
      updateAdditionalWithdrawalData(withdrawal, l1Provider, l2Provider)
    )
  )

  return finalL2ToL1Txns as L2ToL1EventResultPlus[]
}

/* Fetch ETH withdrawals from subgraph */
/* TODO : Add event logs as well */
export const fetchETHWithdrawals = async ({
  address,
  fromBlock,
  toBlock,
  l1Provider,
  l2Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: {
  address: string
  fromBlock: number
  toBlock: number
  l1Provider: Provider
  l2Provider: Provider
  pageSize?: number
  pageNumber?: number
  searchString?: string
}) => {
  const l1ChainID = (await l1Provider.getNetwork()).chainId
  const l2ChainID = (await l2Provider.getNetwork()).chainId

  const latestSubgraphBlockNumber = await fetchL2BlockNumberFromSubgraph(
    l2ChainID
  )

  const ethWithdrawals = await fetchETHWithdrawalsFromSubgraph({
    address,
    fromBlock: 0,
    toBlock: latestSubgraphBlockNumber,
    l2Provider,
    pageSize,
    pageNumber,
    searchString
  })

  const l2ToL1Txns = await Promise.all(
    ethWithdrawals.map(withdrawal =>
      updateAdditionalWithdrawalData(
        withdrawal as L2ToL1EventResultPlus,
        l1Provider,
        l2Provider
      )
    )
  )

  return l2ToL1Txns
}

/* Fetch Token withdrawals from subgraph */
/* TODO : Add event logs as well */
export const fetchTokenWithdrawals = async ({
  address,
  fromBlock,
  toBlock,
  l1Provider,
  l2Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: {
  address: string
  fromBlock: number
  toBlock: number
  l1Provider: Provider
  l2Provider: Provider
  pageSize?: number
  pageNumber?: number
  searchString?: string
}) => {
  const l2ChainID = (await l2Provider.getNetwork()).chainId

  const latestSubgraphBlockNumber = await fetchL2BlockNumberFromSubgraph(
    l2ChainID
  )

  const tokenWithdrawals = await fetchTokenWithdrawalsFromSubgraph({
    address,
    fromBlock: 0,
    toBlock: latestSubgraphBlockNumber,
    l2Provider,
    pageSize,
    pageNumber,
    searchString
  })

  const l2ToL1Txns = await Promise.all(
    tokenWithdrawals.map(withdrawal =>
      updateAdditionalWithdrawalData(withdrawal, l1Provider, l2Provider)
    )
  )

  return l2ToL1Txns
}
