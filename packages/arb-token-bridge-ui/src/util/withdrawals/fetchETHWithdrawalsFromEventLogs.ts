import { Provider, BlockTag } from '@ethersproject/providers'
import { ChildToParentMessageReader } from '@arbitrum/sdk'
import { withBatchRangeProcessing } from './withBatchRangeProcessing'

/**
 * Fetches initiated ETH withdrawals from event logs in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.receiver Address that received the funds
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2Provider Provider for the L2 network
 */
export function fetchETHWithdrawalsFromEventLogs({
  receiver,
  fromBlock,
  toBlock,
  l2Provider
}: {
  receiver?: string
  fromBlock: BlockTag
  toBlock: BlockTag
  l2Provider: Provider
}) {
  if (typeof receiver === 'undefined') {
    return Promise.resolve([])
  }

  return withBatchRangeProcessing({
    fromBlock,
    toBlock,
    provider: l2Provider,
    fetchFunction: async (fromBlock: number, toBlock: number) => {
      return ChildToParentMessageReader.getChildToParentEvents(
        l2Provider,
        { fromBlock, toBlock },
        undefined,
        receiver
      )
    },
    options: {
      logPrefix: 'xxx [fetchETHWithdrawalsFromEventLogs]'
    }
  })
}
