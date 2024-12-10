import { constants } from 'ethers'
import { Provider, BlockTag } from '@ethersproject/providers'
import { Erc20Bridger, getArbitrumNetwork } from '@arbitrum/sdk'

import {
  fetchTokenWithdrawalsFromEventLogs,
  FetchTokenWithdrawalsFromEventLogsParams
} from './fetchTokenWithdrawalsFromEventLogs'
import { getNonce } from '../AddressUtils'
import { fetchL2Gateways } from '../fetchL2Gateways'

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

type WithdrawalQuery = {
  params: FetchTokenWithdrawalsFromEventLogsParams
  priority: number
}

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

type Result = UnwrapPromise<ReturnType<Erc20Bridger['getWithdrawalEvents']>>

export type FetchTokenWithdrawalsFromEventLogsSequentiallyParams = {
  sender?: string
  receiver?: string
  provider: Provider
  fromBlock?: BlockTag
  toBlock?: BlockTag
}

export async function fetchTokenWithdrawalsFromEventLogsSequentially({
  sender,
  receiver,
  provider,
  fromBlock = 0,
  toBlock = 'latest'
}: FetchTokenWithdrawalsFromEventLogsSequentiallyParams): Promise<Result> {
  // keep track of priority, and increment as new stuff is added
  let priority = 1
  // keep track of queries
  const queries: WithdrawalQuery[] = []

  // function here so we can reuse common params
  function buildQuery({
    sender,
    receiver,
    gateways = []
  }: {
    sender?: string
    receiver?: string
    gateways?: string[]
  }): WithdrawalQuery {
    return {
      params: {
        sender,
        receiver,
        fromBlock,
        toBlock,
        l2Provider: provider,
        l2GatewayAddresses: gateways
      },
      // todo: check if priority is incremented at the right time
      priority: ++priority
    }
  }

  const network = await getArbitrumNetwork(provider)
  const senderNonce = await getNonce(sender, { provider })

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
  const standardGateway = network.tokenBridge?.childErc20Gateway!
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
  const customGateway = network.tokenBridge?.childCustomGateway!
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
  const wethGateway = network.tokenBridge?.childWethGateway!
  const customCustomGateways = await fetchL2Gateways(provider)

  // sender queries, only add if nonce > 0
  if (senderNonce > 0) {
    queries.push(buildQuery({ sender, gateways: [standardGateway] }))
    if (wethGateway !== constants.AddressZero) {
      queries.push(buildQuery({ sender, gateways: [wethGateway] }))
    }
    queries.push(buildQuery({ sender, gateways: [customGateway] }))
    queries.push(buildQuery({ sender, gateways: customCustomGateways }))
  }

  // receiver queries
  queries.push(buildQuery({ receiver, gateways: [standardGateway] }))
  if (wethGateway !== constants.AddressZero) {
    queries.push(buildQuery({ receiver, gateways: [wethGateway] }))
  }
  queries.push(buildQuery({ receiver, gateways: [customGateway] }))
  queries.push(buildQuery({ receiver, gateways: customCustomGateways }))

  const maxPriority = queries.map(query => query.priority).sort()[
    queries.length - 1
  ]!

  const result: Result = []
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
