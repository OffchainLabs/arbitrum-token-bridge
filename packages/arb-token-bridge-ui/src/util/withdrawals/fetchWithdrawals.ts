import { Provider } from '@ethersproject/providers'

import { fetchETHWithdrawalsFromEventLogs } from './fetchETHWithdrawalsFromEventLogs'

import {
  FetchWithdrawalsFromSubgraphResult,
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
import { isAlchemyChain } from '../networks'
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
  toBlock
}: FetchWithdrawalsParams): Promise<Withdrawal[]> {
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
    const latestSubgraphBlockNumber = await fetchLatestSubgraphBlockNumber(
      l2ChainID
    )
    toBlock = latestSubgraphBlockNumber
  }

  let withdrawalsFromSubgraph: FetchWithdrawalsFromSubgraphResult[] = []
  try {
    withdrawalsFromSubgraph = (
      await fetchWithdrawalsFromSubgraph({
        sender,
        receiver,
        fromBlock,
        toBlock,
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
  } catch (error) {
    console.log('Error fetching withdrawals from subgraph', error)
  }

  const gateways = await getGateways(l2Provider)
  const senderNonce = await getNonce(sender, { provider: l2Provider })

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

  const ethWithdrawalsFromEventLogs = await backOff(() =>
    fetchETHWithdrawalsFromEventLogs({
      receiver,
      // not sure why eslint is treating "toBlock" as "number | undefined" here
      // even though typescript recognizes it as "number"
      fromBlock: toBlock ?? 0 + 1,
      toBlock: 'latest',
      l2Provider: l2Provider
    })
  )

  await wait(delayMs)

  const tokenWithdrawalsFromEventLogs =
    await fetchTokenWithdrawalsFromEventLogsSequentially({
      sender,
      receiver,
      fromBlock: toBlock + 1,
      toBlock: 'latest',
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
