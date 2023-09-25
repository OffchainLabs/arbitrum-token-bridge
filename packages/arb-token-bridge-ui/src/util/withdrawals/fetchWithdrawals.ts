import { Provider } from '@ethersproject/providers'

import { fetchETHWithdrawalsFromEventLogs } from './fetchETHWithdrawalsFromEventLogs'

import {
  EthWithdrawal,
  attachTimestampToTokenWithdrawals,
  isEthWithdrawal,
  mapETHWithdrawalToL2ToL1EventResult,
  mapTokenWithdrawalFromEventLogsToL2ToL1EventResult,
  mapWithdrawalToL2ToL1EventResult,
  updateAdditionalWithdrawalData
} from './helpers'
import { fetchWithdrawalsFromSubgraph } from './fetchWithdrawalsFromSubgraph'
import { tryFetchLatestSubgraphBlockNumber } from '../SubgraphUtils'
import { fetchTokenWithdrawalsFromEventLogs } from './fetchTokenWithdrawalsFromEventLogs'
import {
  L2ToL1EventResultPlus,
  WithdrawalInitiated
} from '../../hooks/arbTokenBridge.types'
import { fetchL2Gateways } from '../fetchL2Gateways'
import { constants } from 'ethers'

export type FetchWithdrawalsParams = {
  address: string
  fromBlock?: number
  toBlock?: number
  l1Provider: Provider
  l2Provider: Provider
  pageNumber?: number
  pageSize?: number
  searchString?: string
}

/* Fetch complete withdrawals - both ETH and Token withdrawals from subgraph and event logs into one list */
/* Also fills in any additional data required per transaction for our UI logic to work well */
export const fetchWithdrawals = async ({
  address,
  l1Provider,
  l2Provider,
  pageNumber = 0,
  pageSize = 10,
  searchString,
  fromBlock,
  toBlock
}: FetchWithdrawalsParams) => {
  if (typeof address === 'undefined') {
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
      address,
      fromBlock,
      toBlock,
      l2ChainId: l2ChainID,
      pageNumber,
      pageSize,
      searchString
    }),
    fetchETHWithdrawalsFromEventLogs({
      address,
      fromBlock: toBlock + 1,
      toBlock: 'latest',
      l2Provider: l2Provider
    }),
    fetchTokenWithdrawalsFromEventLogs({
      address,
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
  const tokenWithdrawalsFromEventLogsWithTimestamp =
    await attachTimestampToTokenWithdrawals({
      withdrawals: tokenWithdrawalsFromEventLogs,
      l2Provider
    })

  // get ETH and token withdrawals that will be displayed on the current page
  const partialWithdrawalsFromEventLogs = [
    ...ethWithdrawalsFromEventLogs,
    ...tokenWithdrawalsFromEventLogsWithTimestamp
  ]
    .sort((a, b) => (a.timestamp?.gt(b.timestamp || constants.Zero) ? -1 : 1))
    .slice(currentPageStart, currentPageEnd)

  const mappedTokenWithdrawalsFromEventLogs = await Promise.all(
    partialWithdrawalsFromEventLogs
      .filter(withdrawal => !isEthWithdrawal(withdrawal))
      .map(withdrawal =>
        mapTokenWithdrawalFromEventLogsToL2ToL1EventResult(
          withdrawal as WithdrawalInitiated,
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
      ...partialWithdrawalsFromEventLogs
        .filter(isEthWithdrawal)
        .map(withdrawal =>
          mapETHWithdrawalToL2ToL1EventResult(
            withdrawal as EthWithdrawal,
            l1Provider,
            l2Provider,
            l2ChainID
          )
        )
    ])),
    ...mappedTokenWithdrawalsFromEventLogs
  ]
    .filter((msg): msg is L2ToL1EventResultPlus => typeof msg !== 'undefined')
    .sort((msgA, msgB) => +msgA.timestamp - +msgB.timestamp)

  const finalL2ToL1Txns: L2ToL1EventResultPlus[] = await Promise.all(
    l2ToL1Txns.map(withdrawal =>
      updateAdditionalWithdrawalData(withdrawal, l1Provider, l2Provider)
    )
  )

  return finalL2ToL1Txns.map(tx => ({
    ...tx,

    // attach the chain ids to the withdrawal object
    chainId: l2ChainID,
    parentChainId: l1ChainID
  }))
}
