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
  function buildQueryParams({
    sender,
    receiver,
    l2GatewayAddresses
  }: Pick<
    FetchTokenWithdrawalsFromEventLogsParams,
    'sender' | 'receiver' | 'l2GatewayAddresses'
  >) {
    return {
      sender,
      receiver,
      fromBlock,
      toBlock,
      l2Provider: provider,
      l2GatewayAddresses
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

  let prio = 1

  const queries: WithdrawalQuery[] = []

  if (senderNonce > 0) {
    queries.push({
      params: buildQueryParams({
        sender,
        l2GatewayAddresses: [standardGateway]
      }),
      priority: prio
    })
    prio++
    if (wethGateway !== constants.AddressZero) {
      queries.push({
        params: buildQueryParams({
          sender,
          l2GatewayAddresses: [wethGateway]
        }),
        priority: prio
      })
      prio++
    }
    queries.push({
      params: buildQueryParams({
        sender,
        l2GatewayAddresses: [customGateway]
      }),
      priority: prio
    })
    prio++
    queries.push({
      params: buildQueryParams({
        sender,
        l2GatewayAddresses: customCustomGateways
      }),
      priority: prio
    })
    prio++
  }
  queries.push({
    params: buildQueryParams({
      receiver,
      l2GatewayAddresses: [standardGateway]
    }),
    priority: prio
  })
  prio++
  if (wethGateway !== constants.AddressZero) {
    queries.push({
      params: buildQueryParams({
        receiver,
        l2GatewayAddresses: [wethGateway]
      }),
      priority: prio
    })
    prio++
  }
  queries.push({
    params: buildQueryParams({
      receiver,
      l2GatewayAddresses: [customGateway]
    }),
    priority: prio
  })
  prio++
  queries.push({
    params: buildQueryParams({
      receiver,
      l2GatewayAddresses: customCustomGateways
    }),
    priority: prio
  })
  prio++

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
