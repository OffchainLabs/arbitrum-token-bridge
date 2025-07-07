import { Provider } from '@ethersproject/providers'

import { fetchETHWithdrawalsFromEventLogs } from './fetchETHWithdrawalsFromEventLogs'

import {
  WithdrawalFromSubgraph,
  fetchWithdrawalsFromSubgraph
} from './fetchWithdrawalsFromSubgraph'
import { fetchLatestSubgraphBlockNumber } from '../SubgraphUtils'

import { Withdrawal } from '../../hooks/useTransactionHistory'
import { attachTimestampToTokenWithdrawal } from './helpers'
import { WithdrawalInitiated } from '../../hooks/arbTokenBridge.types'
import {
  Query,
  fetchTokenWithdrawalsFromEventLogsSequentially
} from './fetchTokenWithdrawalsFromEventLogsSequentially'
import { backOff, wait } from '../ExponentialBackoffUtils'
import { isAlchemyChain, isNetwork } from '../networks'
import { getArbitrumNetwork } from '@arbitrum/sdk'
import { fetchL2Gateways } from '../fetchL2Gateways'
import { constants } from 'ethers'
import { getNonce } from '../AddressUtils'

async function getGateways(provider: Provider): Promise<{
  standardGateway: string
  wethGateway: string
  customGateway: string
  otherGateways: string[]
}> {
  const network = await getArbitrumNetwork(provider)

  const standardGateway = network.tokenBridge?.childErc20Gateway
  const customGateway = network.tokenBridge?.childCustomGateway
  const wethGateway = network.tokenBridge?.childWethGateway
  const otherGateways = await fetchL2Gateways(provider)

  return {
    standardGateway: standardGateway ?? constants.AddressZero,
    wethGateway: wethGateway ?? constants.AddressZero,
    customGateway: customGateway ?? constants.AddressZero,
    otherGateways
  }
}

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
  forceFetchReceived?: boolean
}

export async function fetchWithdrawals({
  sender,
  receiver,
  l1Provider,
  l2Provider,
  pageNumber = 0,
  pageSize = 10,
  searchString,
  fromBlock,
  toBlock,
  forceFetchReceived = false
}: FetchWithdrawalsParams): Promise<Withdrawal[]> {
  if (typeof sender === 'undefined' && typeof receiver === 'undefined') {
    return []
  }

  const l1ChainID = (await l1Provider.getNetwork()).chainId
  const l2ChainID = (await l2Provider.getNetwork()).chainId

  const { isOrbitChain, isCoreChain } = isNetwork(l2ChainID)

  if (!fromBlock) {
    fromBlock = 0
  }

  // this value will be:
  // {0 or fromBlock} if subgraphs fail (or don't exist), so event logs are fetched from the first block
  // latestSubgraphBlock if subgraphs successful, so we fetch event logs only for unindexed blocks
  let latestFetchedBlock = fromBlock

  const latestSubgraphBlock = await fetchLatestSubgraphBlockNumber(l2ChainID)

  let withdrawalsFromSubgraph: WithdrawalFromSubgraph[] = []
  try {
    const toBlockSubgraph =
      typeof toBlock === 'number'
        ? // get smaller value to respect provided toBlock
          Math.min(latestSubgraphBlock, toBlock)
        : latestSubgraphBlock

    withdrawalsFromSubgraph = (
      await fetchWithdrawalsFromSubgraph({
        sender,
        receiver,
        fromBlock,
        toBlock: toBlockSubgraph,
        l2ChainId: l2ChainID,
        pageNumber,
        pageSize,
        searchString
      })
    ).map(tx => {
      return {
        ...tx,
        direction: 'withdrawal',
        source: 'subgraph',
        parentChainId: l1ChainID,
        childChainId: l2ChainID
      }
    })

    // if successful, this is our latest fetched block and we will use it as a start block for event logs to fetch the remaining data
    latestFetchedBlock = toBlockSubgraph
  } catch (error) {
    console.log('Error fetching withdrawals from subgraph', error)
  }

  const gateways = await getGateways(l2Provider)
  const senderNonce = await backOff(() =>
    getNonce(sender, { provider: l2Provider })
  )

  const queries: Query[] = []

  // alchemy as a raas has a global rate limit across their chains, so we have to fetch sequentially and wait in-between requests to work around this
  const isAlchemy = isAlchemyChain(l2ChainID)
  const delayMs = isAlchemy ? 2_000 : 0

  const allGateways = [
    gateways.standardGateway,
    gateways.wethGateway,
    gateways.customGateway,
    ...gateways.otherGateways
  ]

  // sender queries; only add if nonce > 0
  if (senderNonce > 0) {
    if (isAlchemy) {
      // for alchemy, fetch sequentially
      queries.push({ sender, gateways: [gateways.standardGateway] })
      queries.push({ sender, gateways: [gateways.wethGateway] })
      queries.push({ sender, gateways: [gateways.customGateway] })
      queries.push({ sender, gateways: gateways.otherGateways })
    } else {
      // for other chains, fetch in parallel
      queries.push({ sender, gateways: allGateways })
    }
  }

  const fetchReceivedTransactions =
    // check if we already fetched for each block
    toBlock && latestFetchedBlock >= toBlock
      ? false
      : // receiver queries; only add if nonce > 0 for orbit chains
        isCoreChain || (isOrbitChain && senderNonce > 0) || forceFetchReceived

  if (fetchReceivedTransactions) {
    if (isAlchemy) {
      // for alchemy, fetch sequentially
      queries.push({ receiver, gateways: [gateways.standardGateway] })
      queries.push({ receiver, gateways: [gateways.wethGateway] })
      queries.push({ receiver, gateways: [gateways.customGateway] })
      queries.push({ receiver, gateways: gateways.otherGateways })
    } else {
      // for other chains, fetch in parallel
      queries.push({ receiver, gateways: allGateways })
    }
  }

  const ethWithdrawalsFromEventLogs = fetchReceivedTransactions
    ? await backOff(() =>
        fetchETHWithdrawalsFromEventLogs({
          receiver,
          fromBlock: latestFetchedBlock + 1,
          toBlock: toBlock ?? 'latest',
          l2Provider: l2Provider
        })
      )
    : []

  await wait(delayMs)

  const tokenWithdrawalsFromEventLogs =
    await fetchTokenWithdrawalsFromEventLogsSequentially({
      sender,
      receiver,
      fromBlock: latestFetchedBlock + 1,
      toBlock: toBlock ?? 'latest',
      provider: l2Provider,
      queries
    })

  const mappedEthWithdrawalsFromEventLogs: Withdrawal[] =
    ethWithdrawalsFromEventLogs.map(tx => {
      return {
        ...tx,
        direction: 'withdrawal',
        source: 'event_logs',
        parentChainId: l1ChainID,
        childChainId: l2ChainID
      }
    })

  const mappedTokenWithdrawalsFromEventLogs: WithdrawalInitiated[] =
    tokenWithdrawalsFromEventLogs.map(tx => {
      return {
        ...tx,
        direction: 'withdrawal',
        source: 'event_logs',
        parentChainId: l1ChainID,
        childChainId: l2ChainID
      }
    })

  // we need timestamps to sort token withdrawals along ETH withdrawals
  const tokenWithdrawalsFromEventLogsWithTimestamp: Withdrawal[] =
    await Promise.all(
      mappedTokenWithdrawalsFromEventLogs.map(withdrawal =>
        attachTimestampToTokenWithdrawal({ withdrawal, l2Provider })
      )
    )

  return [
    ...mappedEthWithdrawalsFromEventLogs,
    ...tokenWithdrawalsFromEventLogsWithTimestamp,
    ...withdrawalsFromSubgraph
  ]
}
