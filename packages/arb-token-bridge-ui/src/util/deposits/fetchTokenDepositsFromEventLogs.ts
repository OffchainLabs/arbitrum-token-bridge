import { EventArgs, EventFetcher } from '@arbitrum/sdk'
import { L1ERC20Gateway__factory } from '@arbitrum/sdk/dist/lib/abi/factories/L1ERC20Gateway__factory'
import { DepositInitiatedEvent } from '@arbitrum/sdk/dist/lib/abi/L1ERC20Gateway'
import { BlockTag } from '@ethersproject/providers'

import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { dedupeEvents } from '../../components/TransactionHistory/helpers'

/**
 * Get the parent network events created by a deposit
 * @param parentChainId
 * @param gatewayAddress
 * @param filter
 * @param parentTokenAddress
 * @param fromAddress
 * @param toAddress
 * @returns
 */
export async function getDepositEvents(
  parentChainId: number,
  gatewayAddress: string,
  filter: { fromBlock: BlockTag; toBlock: BlockTag },
  parentTokenAddress?: string,
  fromAddress?: string,
  toAddress?: string
): Promise<(EventArgs<DepositInitiatedEvent> & { txHash: string })[]> {
  const parentProvider = getProviderForChainId(parentChainId)

  const eventFetcher = new EventFetcher(parentProvider)
  const events = (
    await eventFetcher.getEvents(
      L1ERC20Gateway__factory,
      contract =>
        contract.filters.DepositInitiated(
          null, // parentToken
          fromAddress || null, // _from
          toAddress || null // _to
        ),
      { ...filter, address: gatewayAddress }
    )
  ).map(a => ({ txHash: a.transactionHash, ...a.event }))

  return parentTokenAddress
    ? events.filter(
        log =>
          log.l1Token.toLocaleLowerCase() ===
          parentTokenAddress.toLocaleLowerCase()
      )
    : events
}

export type FetchTokenDepositsFromEventLogsParams = {
  sender?: string
  receiver?: string
  fromBlock: BlockTag
  toBlock: BlockTag
  parentChainId: number
  parentGatewayAddresses?: string[]
}

/**
 * Fetches initiated token deposits from event logs in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.sender Address that initiated the withdrawal
 * @param query.receiver Address that received the funds
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.childChainId child chain id
 * @param query.parentGatewayAddresses L2 gateway addresses to use
 */
export async function fetchTokenDepositsFromEventLogs({
  sender,
  receiver,
  fromBlock,
  toBlock,
  parentChainId,
  parentGatewayAddresses = []
}: FetchTokenDepositsFromEventLogsParams) {
  const promises: ReturnType<typeof getDepositEvents>[] = []

  parentGatewayAddresses.forEach(gatewayAddress => {
    // funds sent by this address
    if (sender) {
      promises.push(
        getDepositEvents(
          parentChainId,
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
        getDepositEvents(
          parentChainId,
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
  return dedupeEvents<DepositInitiatedEvent>(
    (await Promise.all(promises)).flat()
  )
}
