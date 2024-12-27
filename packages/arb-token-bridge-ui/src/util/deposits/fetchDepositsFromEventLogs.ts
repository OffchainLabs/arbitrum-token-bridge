import { Provider, BlockTag } from '@ethersproject/providers'
import {
  ChildToParentMessageReader,
  EventArgs,
  EventFetcher,
  getArbitrumNetwork
} from '@arbitrum/sdk'
import { BigNumber } from 'ethers'
import { Inbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Inbox__factory'

type ParentToChildTxEvent = {
  messageNum: BigNumber
  data: string
}

async function getParentToChildEvents(
  parentProvider: Provider,
  childChainId: number,
  filter: { fromBlock: BlockTag; toBlock: BlockTag },
  position?: BigNumber,
  destination?: string,
  hash?: BigNumber
): Promise<(ParentToChildTxEvent & { transactionHash: string })[]> {
  const eventFetcher = new EventFetcher(parentProvider)
  const childChain = getArbitrumNetwork(childChainId)

  return (
    await eventFetcher.getEvents(
      Inbox__factory,
      t => t.filters.InboxMessageDelivered(),
      { ...filter, address: childChain.ethBridge.inbox }
    )
  ).map(l => ({ ...l.event, transactionHash: l.transactionHash }))
}

/**
 * Fetches initiated ETH deposits from event logs in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.receiver Address that received the funds
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.parentProvider Provider for the parent network
 */
export function fetchETHDepositsFromEventLogs({
  receiver,
  fromBlock,
  toBlock,
  parentProvider,
  childChainId
}: {
  receiver?: string
  fromBlock: BlockTag
  toBlock: BlockTag
  parentProvider: Provider
  childChainId: number
}) {
  if (typeof receiver === 'undefined') {
    return Promise.resolve([])
  }

  // funds received by this address
  return getParentToChildEvents(
    parentProvider,
    childChainId,
    { fromBlock, toBlock },
    undefined,
    receiver
  )
}
