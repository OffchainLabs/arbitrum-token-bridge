import {
  BlockTag,
  Provider,
  StaticJsonRpcProvider
} from '@ethersproject/providers'

import { fetchETHWithdrawalsFromEventLogs } from './fetchETHWithdrawalsFromEventLogs'

import {
  FetchWithdrawalsFromSubgraphResult,
  fetchWithdrawalsFromSubgraph
} from './fetchWithdrawalsFromSubgraph'
import { fetchLatestSubgraphBlockNumber } from '../SubgraphUtils'
import { fetchTokenWithdrawalsFromEventLogs } from './fetchTokenWithdrawalsFromEventLogs'
import { fetchL2Gateways } from '../fetchL2Gateways'
import { Withdrawal } from '../../hooks/useTransactionHistory'
import { attachTimestampToTokenWithdrawal } from './helpers'
import { WithdrawalInitiated } from '../../hooks/arbTokenBridge.types'
import { Erc20Bridger, getArbitrumNetwork } from '@arbitrum/sdk'
import { ethers } from 'ethers'
import { getNonce } from '../AddressUtils'

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

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

type WithdrawalQuery = {
  params: {
    sender?: string
    receiver?: string
    fromBlock: BlockTag
    toBlock: BlockTag
    provider: Provider
    gateways?: string[]
  }
  priority: number
}

type Result = UnwrapPromise<ReturnType<Erc20Bridger['getWithdrawalEvents']>>

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchTokenWithdrawalsFromEventLogsSequentially(
  address: string,
  provider: Provider,
  fromBlock: BlockTag
): Promise<Result> {
  await wait(2000)

  const network = await getArbitrumNetwork(provider)
  const senderNonce = await getNonce(address, { provider: provider })

  const standardGateway = network.tokenBridge?.childErc20Gateway!
  const customGateway = network.tokenBridge?.childCustomGateway!
  const wethGateway = network.tokenBridge?.childWethGateway!

  let prio = 1

  const queries: WithdrawalQuery[] = []

  if (senderNonce > 0) {
    queries.push({
      params: {
        sender: address,
        fromBlock,
        toBlock: 'latest',
        provider,
        gateways: [standardGateway]
      },
      priority: prio
    })
    prio++
    if (wethGateway !== ethers.constants.AddressZero) {
      queries.push({
        params: {
          sender: address,
          fromBlock,
          toBlock: 'latest',
          provider,
          gateways: [wethGateway]
        },
        priority: prio
      })
      prio++
    }
    queries.push({
      params: {
        sender: address,
        fromBlock,
        toBlock: 'latest',
        provider,
        gateways: [customGateway]
      },
      priority: prio
    })
    prio++
  }

  queries.push({
    params: {
      receiver: address,
      fromBlock,
      toBlock: 'latest',
      provider,
      gateways: [standardGateway]
    },
    priority: prio
  })
  prio++
  if (wethGateway !== ethers.constants.AddressZero) {
    queries.push({
      params: {
        receiver: address,
        fromBlock,
        toBlock: 'latest',
        provider,
        gateways: [wethGateway]
      },
      priority: prio
    })
    prio++
  }
  queries.push({
    params: {
      receiver: address,
      fromBlock,
      toBlock: 'latest',
      provider,
      gateways: [customGateway]
    },
    priority: prio
  })
  prio++

  const maxPriority = queries.map(query => query.priority).sort()[
    queries.length - 1
  ]!

  let result: Result = []
  let currentPriority = 1

  while (currentPriority <= maxPriority) {
    const filteredQueries = queries.filter(
      query => query.priority === currentPriority
    )

    const results = await Promise.all(
      filteredQueries.map(query =>
        fetchTokenWithdrawalsFromEventLogs(query.params)
      )
    )

    results.forEach(r => {
      result.push(...r)
    })

    await wait(2000)

    currentPriority += 1
  }

  return result
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

  const l2GatewayAddresses = await fetchL2Gateways(l2Provider)

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

  const [ethWithdrawalsFromEventLogs, tokenWithdrawalsFromEventLogs] =
    await Promise.all([
      fetchETHWithdrawalsFromEventLogs({
        receiver,
        fromBlock: toBlock + 1,
        toBlock: 'latest',
        l2Provider: l2Provider
      }),
      fetchTokenWithdrawalsFromEventLogsSequentially(
        sender!,
        l2Provider,
        toBlock + 1
      )
    ])

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
