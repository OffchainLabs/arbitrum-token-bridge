import { constants } from 'ethers'
import { Provider, BlockTag } from '@ethersproject/providers'
import { Erc20Bridger, getArbitrumNetwork } from '@arbitrum/sdk'

import {
  fetchTokenWithdrawalsFromEventLogs,
  FetchTokenWithdrawalsFromEventLogsParams
} from './fetchTokenWithdrawalsFromEventLogs'
import { getNonce } from '../AddressUtils'
import { fetchL2Gateways } from '../fetchL2Gateways'
import { backOff, wait } from '../ExponentialBackoffUtils'

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

type TokenWithdrawalQuery = {
  params: FetchTokenWithdrawalsFromEventLogsParams
  priority: number
}

export type FetchTokenWithdrawalsFromEventLogsSequentiallyParams = {
  sender?: string
  receiver?: string
  provider: Provider
  fromBlock?: BlockTag
  toBlock?: BlockTag
  /**
   * How long to delay in-between queries of different priority.
   */
  delayMs?: number
}

export type FetchTokenWithdrawalsFromEventLogsSequentiallyResult = Awaited<
  ReturnType<Erc20Bridger['getWithdrawalEvents']>
>

export async function fetchTokenWithdrawalsFromEventLogsSequentially({
  sender,
  receiver,
  provider,
  fromBlock = 0,
  toBlock = 'latest',
  delayMs = 2_000
}: FetchTokenWithdrawalsFromEventLogsSequentiallyParams): Promise<FetchTokenWithdrawalsFromEventLogsSequentiallyResult> {
  // keep track of priority; increment as queries are added
  let priority = 0
  // keep track of queries
  const queries: TokenWithdrawalQuery[] = []

  // helper function to reuse common params
  function buildQueryParams({
    sender,
    receiver,
    gateways = []
  }: {
    sender?: string
    receiver?: string
    gateways?: string[]
  }): TokenWithdrawalQuery['params'] {
    return {
      sender,
      receiver,
      fromBlock,
      toBlock,
      l2Provider: provider,
      l2GatewayAddresses: gateways
    }
  }

  // for sanitizing, adding queries and incrementing priority
  function addQuery(params: TokenWithdrawalQuery['params']) {
    const gateways = params.l2GatewayAddresses ?? []
    const gatewaysSanitized = gateways.filter(g => g !== constants.AddressZero)

    if (gatewaysSanitized.length === 0) {
      return
    }

    queries.push({
      params: { ...params, l2GatewayAddresses: gatewaysSanitized },
      priority: ++priority
    })
  }

  const gateways = await getGateways(provider)
  const senderNonce = await backOff(() => getNonce(sender, { provider }))

  // sender queries; only add if nonce > 0
  if (senderNonce > 0) {
    addQuery(buildQueryParams({ sender, gateways: [gateways.standardGateway] }))
    addQuery(buildQueryParams({ sender, gateways: [gateways.wethGateway] }))
    addQuery(buildQueryParams({ sender, gateways: [gateways.customGateway] }))
    addQuery(buildQueryParams({ sender, gateways: gateways.otherGateways }))
  }

  // receiver queries
  addQuery(buildQueryParams({ receiver, gateways: [gateways.standardGateway] }))
  addQuery(buildQueryParams({ receiver, gateways: [gateways.wethGateway] }))
  addQuery(buildQueryParams({ receiver, gateways: [gateways.customGateway] }))
  addQuery(buildQueryParams({ receiver, gateways: gateways.otherGateways }))

  // for iterating through all priorities in the while loop below
  let currentPriority = 1

  // final result
  const result: FetchTokenWithdrawalsFromEventLogsSequentiallyResult = []

  while (currentPriority <= priority) {
    const currentPriorityQueries = queries.filter(
      query => query.priority === currentPriority
    )

    const currentPriorityResults = await Promise.all(
      currentPriorityQueries.map(query =>
        backOff(() => fetchTokenWithdrawalsFromEventLogs(query.params))
      )
    )

    currentPriorityResults.forEach(r => {
      result.push(...r)
    })

    await wait(delayMs)

    currentPriority++
  }

  return result
}
