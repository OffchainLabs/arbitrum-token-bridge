import { Provider } from '@ethersproject/providers'
import { constants as arbitrumConstants } from '@arbitrum/sdk'

import { fetchETHWithdrawalsFromEventLogs } from './fetchETHWithdrawalsFromEventLogs'

import {
  mapETHWithdrawalToL2ToL1EventResult,
  mapTokenWithdrawalFromEventLogsToL2ToL1EventResult,
  mapWithdrawalToL2ToL1EventResult,
  updateAdditionalWithdrawalData
} from './helpers'
import { fetchWithdrawalsFromSubgraph } from './fetchWithdrawalsFromSubgraph'
import { tryFetchLatestSubgraphBlockNumber } from '../SubgraphUtils'
import { fetchTokenWithdrawalsFromEventLogs } from './fetchTokenWithdrawalsFromEventLogs'
import { L2ToL1EventResultPlus } from '../../hooks/arbTokenBridge.types'

export type FetchWithdrawalsParams = {
  sender?: string
  senderNot?: string
  receiver?: string
  receiverNot?: string
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
  sender,
  senderNot,
  receiver,
  receiverNot,
  l1Provider,
  l2Provider,
  gatewayAddresses,
  pageNumber = 0,
  pageSize,
  searchString,
  fromBlock,
  toBlock
}: FetchWithdrawalsParams) => {
  if (typeof sender === 'undefined' && typeof receiver === 'undefined') {
    return []
  }

  const l1ChainID = (await l1Provider.getNetwork()).chainId
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

  // todo: update when eth withdrawals to a custom destination address are enabled (requires https://github.com/OffchainLabs/arbitrum-sdk/issues/325)
  function getETHWithdrawalsFromEventLogsQuery() {
    // give me all the eth withdrawals that someone else initiated, but the funds are sent to me
    if (receiver) {
      // since we don't do eth withdrawals to a custom destination address, we don't expect any results here
      // however, if we pass in `undefined`, it will skip the filter and give us everything, which is why we use the node interface address that should never return any results
      return { toAddress: arbitrumConstants.NODE_INTERFACE_ADDRESS }
    }

    // give me all the eth withdrawals that i initiated
    // since we don't do eth withdrawals to a custom destination address, we set `toAddress` to be the sender, giving us all withdrawals sent to the same address
    return { toAddress: sender }
  }

  function getTokenWithdrawalsFromEventLogsQuery() {
    // give me all the token withdrawals that someone else initiated, but the funds are sent to me
    // because we can't exclude withdrawals that were sent from the same address, we have to filter them out later, see `mappedTokenWithdrawalsFromEventLogs`
    if (receiver) {
      return { fromAddress: undefined, toAddress: receiver }
    }

    // give me all the token withdrawals that i initiated
    return { fromAddress: sender, toAddress: undefined }
  }

  const [
    withdrawalsFromSubgraph,
    ethWithdrawalsFromEventLogs,
    tokenWithdrawalsFromEventLogs
  ] = await Promise.all([
    fetchWithdrawalsFromSubgraph({
      sender,
      senderNot,
      receiver,
      receiverNot,
      fromBlock: fromBlock,
      toBlock: toBlock,
      l2ChainId: l2ChainID,
      pageNumber,
      pageSize,
      searchString
    }),
    fetchETHWithdrawalsFromEventLogs({
      ...getETHWithdrawalsFromEventLogsQuery(),
      fromBlock: toBlock + 1,
      toBlock: 'latest',
      l2Provider: l2Provider
    }),
    fetchTokenWithdrawalsFromEventLogs({
      ...getTokenWithdrawalsFromEventLogsQuery(),
      fromBlock: toBlock + 1,
      toBlock: 'latest',
      l2Provider: l2Provider,
      l2GatewayAddresses: gatewayAddresses
    })
  ])

  const mappedTokenWithdrawalsFromEventLogs = (
    await Promise.all([
      ...tokenWithdrawalsFromEventLogs.map(withdrawal =>
        mapTokenWithdrawalFromEventLogsToL2ToL1EventResult(
          withdrawal,
          l1Provider,
          l2Provider,
          l2ChainID
        )
      )
    ])
  )
    // when viewing received funds, we don't want to see funds sent from the same address, so we filter them out
    .filter(withdrawal => {
      if (senderNot && receiver && withdrawal) {
        return withdrawal.sender?.toLowerCase() !== senderNot.toLowerCase()
      }

      return true
    })

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
      ...ethWithdrawalsFromEventLogs.map(withdrawal =>
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
