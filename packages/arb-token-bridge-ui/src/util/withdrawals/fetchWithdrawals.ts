import { BigNumber, constants } from 'ethers'
import { Provider } from '@ethersproject/providers'

import { fetchETHWithdrawalsFromEventLogs } from './fetchETHWithdrawalsFromEventLogs'

import {
  EthWithdrawal,
  attachTimestampToTokenWithdrawal,
  isTokenWithdrawal,
  mapETHWithdrawalToL2ToL1EventResult,
  mapTokenWithdrawalFromEventLogsToL2ToL1EventResult,
  mapWithdrawalToL2ToL1EventResult
} from './helpers'
import { fetchWithdrawalsFromSubgraph } from './fetchWithdrawalsFromSubgraph'
import { tryFetchLatestSubgraphBlockNumber } from '../SubgraphUtils'
import { fetchTokenWithdrawalsFromEventLogs } from './fetchTokenWithdrawalsFromEventLogs'
import {
  L2ToL1EventResultPlus,
  WithdrawalInitiated
} from '../../hooks/arbTokenBridge.types'
import { fetchL2Gateways } from '../fetchL2Gateways'

export type FetchWithdrawalsParams = {
  sender?: string
  receiver?: string
  fromBlock?: number
  toBlock?: number
  l1Provider: Provider
  l2Provider: Provider
  pageNumber?: number
  pageSize?: number
  searchString?: string
}

type Timestamped = {
  timestamp?: BigNumber
}

function sortByTimestampDescending(a: Timestamped, b: Timestamped) {
  const aTimestamp = a.timestamp ?? constants.Zero
  const bTimestamp = b.timestamp ?? constants.Zero

  return aTimestamp.gt(bTimestamp) ? -1 : 1
}

/* Fetch complete withdrawals - both ETH and Token withdrawals from subgraph and event logs into one list */
/* Also fills in any additional data required per transaction for our UI logic to work well */
export const fetchWithdrawals = async ({
  sender,
  receiver,
  l1Provider,
  l2Provider,
  pageNumber = 0,
  pageSize = 10,
  searchString,
  fromBlock,
  toBlock
}: FetchWithdrawalsParams) => {
  if (typeof sender === 'undefined' && typeof receiver === 'undefined') {
    return []
  }

  const l1ChainID = (await l1Provider.getNetwork()).chainId
  const l2ChainID = (await l2Provider.getNetwork()).chainId

  const l2GatewayAddresses = await fetchL2Gateways(l2Provider)

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
      sender,
      receiver,
      fromBlock,
      toBlock,
      l2ChainId: l2ChainID,
      pageNumber,
      pageSize,
      searchString
    }),
    fetchETHWithdrawalsFromEventLogs({
      receiver,
      fromBlock: toBlock + 1,
      toBlock: 'latest',
      l2Provider: l2Provider
    }),
    fetchTokenWithdrawalsFromEventLogs({
      sender,
      receiver,
      fromBlock: toBlock + 1,
      toBlock: 'latest',
      l2Provider: l2Provider,
      l2GatewayAddresses
    })
  ])

  // get txs to be displayed on the current page (event logs)
  const currentPageStart = pageNumber * pageSize
  const currentPageEnd = currentPageStart + pageSize

  // we need timestamps to sort token withdrawals along ETH withdrawals
  const tokenWithdrawalsFromEventLogsWithTimestamp = await Promise.all(
    tokenWithdrawalsFromEventLogs.map(withdrawal =>
      attachTimestampToTokenWithdrawal({ withdrawal, l2Provider })
    )
  )

  // get ETH and token withdrawals that will be displayed on the current page
  const paginatedWithdrawalsFromEventLogs = [
    ...ethWithdrawalsFromEventLogs,
    ...tokenWithdrawalsFromEventLogsWithTimestamp
  ]
    .sort(sortByTimestampDescending)
    .slice(currentPageStart, currentPageEnd)

  const paginatedTokenWithdrawalsFromEventLogs: WithdrawalInitiated[] = []
  const paginatedEthWithdrawalsFromEventLogs: EthWithdrawal[] = []

  for (const withdrawal of paginatedWithdrawalsFromEventLogs) {
    if (isTokenWithdrawal(withdrawal)) {
      paginatedTokenWithdrawalsFromEventLogs.push(withdrawal)
    } else {
      paginatedEthWithdrawalsFromEventLogs.push(withdrawal)
    }
  }

  const mappedTokenWithdrawalsFromEventLogs = await Promise.all(
    paginatedTokenWithdrawalsFromEventLogs.map(withdrawal =>
      mapTokenWithdrawalFromEventLogsToL2ToL1EventResult(
        withdrawal,
        l1Provider,
        l2Provider,
        l2ChainID
      )
    )
  )

  const l2ToL1Txns = [
    ...(await Promise.all([
      ...withdrawalsFromSubgraph.map(withdrawal =>
        mapWithdrawalToL2ToL1EventResult(
          withdrawal,
          l1Provider,
          l2Provider,
          l2ChainID
        )
      ),
      ...paginatedEthWithdrawalsFromEventLogs.map(withdrawal =>
        mapETHWithdrawalToL2ToL1EventResult(
          withdrawal,
          l1Provider,
          l2Provider,
          l2ChainID
        )
      )
    ])),
    ...mappedTokenWithdrawalsFromEventLogs
  ]
    .filter((msg): msg is L2ToL1EventResultPlus => typeof msg !== 'undefined')
    .sort(sortByTimestampDescending)

  return l2ToL1Txns.map(tx => ({
    ...tx,

    // attach the chain ids to the withdrawal object
    chainId: l2ChainID,
    parentChainId: l1ChainID
  }))
}
