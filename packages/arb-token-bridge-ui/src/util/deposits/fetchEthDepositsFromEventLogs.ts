import { BlockTag } from '@ethersproject/providers'
import { EventFetcher, getArbitrumNetwork } from '@arbitrum/sdk'
import { BigNumber } from 'ethers'
import { Inbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Inbox__factory'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'

type ParentToChildTxEvent = {
  messageNum: BigNumber
  data: string
}

// Only for ETH
async function getParentToChildEvents(
  childChainId: number,
  filter: { fromBlock: BlockTag; toBlock: BlockTag },
  position?: BigNumber,
  destination?: string,
  hash?: BigNumber
): Promise<(ParentToChildTxEvent & { transactionHash: string })[]> {
  const childChain = getArbitrumNetwork(childChainId)
  const parentProvider = getProviderForChainId(childChain.parentChainId)
  const eventFetcher = new EventFetcher(parentProvider)

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
 */
export function fetchEthDepositsFromEventLogs({
  fromBlock,
  toBlock,
  childChainId
}: {
  fromBlock: BlockTag
  toBlock: BlockTag
  childChainId: number
}) {
  // funds received by this address
  return getParentToChildEvents(childChainId, { fromBlock, toBlock })
}
