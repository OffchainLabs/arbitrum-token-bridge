import { Provider, BlockTag } from '@ethersproject/providers'
import { ChildToParentMessageReader } from '@arbitrum/sdk'
import { withBatchRangeProcessing } from './withBatchRangeProcessing'
import { isNetwork } from '../networks'

/**
 * Fetches initiated ETH withdrawals from event logs in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.receiver Address that received the funds
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2Provider Provider for the L2 network
 */
export async function fetchETHWithdrawalsFromEventLogs({
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

  const fetchFunction = async (fromBlock: number, toBlock: number) => {
    return ChildToParentMessageReader.getChildToParentEvents(
      l2Provider,
      { fromBlock, toBlock },
      undefined,
      receiver
    )
  }

  // Get chain ID to check if it's an orbit chain
  const chainId = await l2Provider.getNetwork().then(network => network.chainId)
  const { isOrbitChain } = isNetwork(chainId)

  if (isOrbitChain) {
    // Use batch range processing for orbit chains
    return withBatchRangeProcessing({
      fromBlock,
      toBlock,
      provider: l2Provider,
      fetchFunction,
      options: {
        enableLogging: false,
        logPrefix: '[fetchETHWithdrawalsFromEventLogs]'
      }
    })
  } else {
    // Use direct query for non-orbit chains since they're pretty optimized
    return fetchFunction(
      typeof fromBlock === 'number'
        ? fromBlock
        : parseInt(fromBlock.toString()),
      toBlock === 'latest'
        ? await l2Provider.getBlockNumber()
        : typeof toBlock === 'number'
        ? toBlock
        : parseInt(toBlock.toString())
    )
  }
}
