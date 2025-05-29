import { Erc20Bridger } from '@arbitrum/sdk'
import { BlockTag, Provider } from '@ethersproject/providers'
import { constants } from 'ethers'

import { backOff, wait } from '../ExponentialBackoffUtils'
import {
  fetchTokenWithdrawalsFromEventLogs,
  FetchTokenWithdrawalsFromEventLogsParams
} from './fetchTokenWithdrawalsFromEventLogs'

type FetchTokenWithdrawalsFromEventLogsQuery = {
  params: FetchTokenWithdrawalsFromEventLogsParams
  priority: number
}

export type Query = {
  sender?: string
  receiver?: string
  gateways?: string[]
}

export type FetchTokenWithdrawalsFromEventLogsSequentiallyParams = {
  sender?: string
  receiver?: string
  provider: Provider
  fromBlock?: BlockTag
  toBlock?: BlockTag
  /**
   * How long to delay in-between queries of different priority. Defaults to 0.
   */
  delayMs?: number
  queries: Query[]
}

export type FetchTokenWithdrawalsFromEventLogsSequentiallyResult = Awaited<
  ReturnType<Erc20Bridger['getWithdrawalEvents']>
>

export async function fetchTokenWithdrawalsFromEventLogsSequentially({
  provider,
  fromBlock = 0,
  toBlock = 'latest',
  delayMs = 0,
  queries: queriesProp
}: FetchTokenWithdrawalsFromEventLogsSequentiallyParams): Promise<FetchTokenWithdrawalsFromEventLogsSequentiallyResult> {
  // keep track of priority; increment as queries are added
  let priority = 0

  // keep track of queries
  const queries: FetchTokenWithdrawalsFromEventLogsQuery[] = []

  // helper function to reuse common params
  function buildQueryParams({
    sender,
    receiver,
    gateways = []
  }: Query): FetchTokenWithdrawalsFromEventLogsQuery['params'] {
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
  function addQuery(params: FetchTokenWithdrawalsFromEventLogsQuery['params']) {
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

  queriesProp.forEach(query => {
    addQuery(buildQueryParams(query))
  })

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
