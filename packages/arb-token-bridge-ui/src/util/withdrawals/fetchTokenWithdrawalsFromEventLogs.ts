import { Provider, BlockTag } from '@ethersproject/providers'
import { Erc20Bridger, EventArgs } from '@arbitrum/sdk'
import { WithdrawalInitiatedEvent } from '@arbitrum/sdk/dist/lib/abi/L2ArbitrumGateway'
import { withBatchRangeProcessing } from './withBatchRangeProcessing'
import { isNetwork } from '../networks'

function dedupeEvents(
  events: (EventArgs<WithdrawalInitiatedEvent> & {
    txHash: string
  })[]
) {
  return [...new Map(events.map(item => [item.txHash, item])).values()]
}

export type FetchTokenWithdrawalsFromEventLogsParams = {
  sender?: string
  receiver?: string
  fromBlock: BlockTag
  toBlock: BlockTag
  l2Provider: Provider
  l2GatewayAddresses?: string[]
}

/**
 * Fetches initiated token withdrawals from event logs in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.sender Address that initiated the withdrawal
 * @param query.receiver Address that received the funds
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2Provider Provider for the L2 network
 * @param query.l2GatewayAddresses L2 gateway addresses to use
 */
export async function fetchTokenWithdrawalsFromEventLogs({
  sender,
  receiver,
  fromBlock,
  toBlock,
  l2Provider,
  l2GatewayAddresses = []
}: FetchTokenWithdrawalsFromEventLogsParams) {
  // Define the fetch function once
  const fetchFunction = async (fromBlock: number, toBlock: number) => {
    return fetchTokenWithdrawalsInRange({
      sender,
      receiver,
      fromBlock,
      toBlock,
      l2Provider,
      l2GatewayAddresses
    })
  }

  // Get chain ID to check if it's an orbit chain
  const chainId = await l2Provider.getNetwork().then(network => network.chainId)
  const { isOrbitChain } = isNetwork(chainId)

  if (isOrbitChain) {
    // Use batch range processing for orbit chains
    const results = await withBatchRangeProcessing({
      fromBlock,
      toBlock,
      provider: l2Provider,
      fetchFunction,
      options: {
        enableLogging: false,
        logPrefix: '[fetchTokenWithdrawalsFromEventLogs]'
      }
    })

    return dedupeEvents(results)
  } else {
    // Use direct query for non-orbit chains
    const results = await fetchFunction(
      typeof fromBlock === 'number'
        ? fromBlock
        : parseInt(fromBlock.toString()),
      toBlock === 'latest'
        ? await l2Provider.getBlockNumber()
        : typeof toBlock === 'number'
        ? toBlock
        : parseInt(toBlock.toString())
    )

    return dedupeEvents(results)
  }
}

async function fetchTokenWithdrawalsInRange({
  sender,
  receiver,
  fromBlock,
  toBlock,
  l2Provider,
  l2GatewayAddresses = []
}: FetchTokenWithdrawalsFromEventLogsParams) {
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
  const promises: ReturnType<Erc20Bridger['getWithdrawalEvents']>[] = []

  l2GatewayAddresses.forEach(gatewayAddress => {
    // funds sent by this address
    if (sender) {
      promises.push(
        erc20Bridger.getWithdrawalEvents(
          l2Provider,
          gatewayAddress,
          { fromBlock, toBlock },
          undefined,
          sender,
          undefined
        )
      )
    }

    // funds received by this address
    if (receiver) {
      promises.push(
        erc20Bridger.getWithdrawalEvents(
          l2Provider,
          gatewayAddress,
          { fromBlock, toBlock },
          undefined,
          undefined,
          receiver
        )
      )
    }
  })

  // when getting funds received by this address we will also get duplicate txs returned in 'funds sent by this address'
  return (await Promise.all(promises)).flat()
}
