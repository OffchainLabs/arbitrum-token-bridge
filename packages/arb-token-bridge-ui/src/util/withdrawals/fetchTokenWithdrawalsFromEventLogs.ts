import { Provider, BlockTag } from '@ethersproject/providers'
import { Erc20Bridger, EventArgs } from '@arbitrum/sdk'
import { WithdrawalInitiatedEvent } from '@arbitrum/sdk/dist/lib/abi/L2ArbitrumGateway'
import { backOff } from 'exponential-backoff'

import { getNonce } from '../AddressUtils'

function dedupeEvents(
  events: (EventArgs<WithdrawalInitiatedEvent> & {
    txHash: string
  })[]
) {
  return [...new Map(events.map(item => [item.txHash, item])).values()]
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetches initiated token withdrawals from event logs in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.sender Address that initiated the withdrawal
 * @param query.receiver Address that received the funds
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.provider Provider for the child network
 * @param query.gateways L2 gateway addresses to use
 */
export async function fetchTokenWithdrawalsFromEventLogs({
  sender,
  receiver,
  fromBlock,
  toBlock,
  provider,
  gateways = []
}: {
  sender?: string
  receiver?: string
  fromBlock: BlockTag
  toBlock: BlockTag
  provider: Provider
  gateways?: string[]
}) {
  const erc20Bridger = await Erc20Bridger.fromProvider(provider)
  const promises: ReturnType<Erc20Bridger['getWithdrawalEvents']>[] = []

  const senderNonce = await getNonce(sender, { provider: provider })

  await wait(1000)

  gateways.forEach(gatewayAddress => {
    // funds sent by this address
    if (sender && senderNonce > 0) {
      promises.push(
        backOff(() =>
          erc20Bridger.getWithdrawalEvents(
            provider,
            gatewayAddress,
            { fromBlock, toBlock },
            undefined,
            sender,
            undefined
          )
        )
      )
    }

    // funds received by this address
    if (receiver) {
      promises.push(
        backOff(
          () =>
            erc20Bridger.getWithdrawalEvents(
              provider,
              gatewayAddress,
              { fromBlock, toBlock },
              undefined,
              undefined,
              receiver
            ) as any
        )
      )
    }
  })

  // when getting funds received by this address we will also get duplicate txs returned in 'funds sent by this address'
  return dedupeEvents((await Promise.all(promises)).flat())
}
