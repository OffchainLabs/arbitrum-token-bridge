import { Provider, BlockTag } from '@ethersproject/providers'
import { Erc20Bridger } from '@arbitrum/sdk'
import { EventArgs } from '@arbitrum/sdk/dist/lib/dataEntities/event'
import { WithdrawalInitiatedEvent } from '@arbitrum/sdk/dist/lib/abi/L2ArbitrumGateway'

function dedupeEvents(
  events: (EventArgs<WithdrawalInitiatedEvent> & {
    txHash: string
  })[]
) {
  return [...new Map(events.map(item => [item.txHash, item])).values()]
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
}: {
  sender?: string
  receiver?: string
  fromBlock: BlockTag
  toBlock: BlockTag
  l2Provider: Provider
  l2GatewayAddresses?: string[]
}) {
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
  const promises: ReturnType<Erc20Bridger['getL2WithdrawalEvents']>[] = []

  l2GatewayAddresses.forEach(gatewayAddress => {
    // funds sent by this address
    if (sender) {
      promises.push(
        erc20Bridger.getL2WithdrawalEvents(
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
        erc20Bridger.getL2WithdrawalEvents(
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
  return dedupeEvents((await Promise.all(promises)).flat())
}
