import { Provider, BlockTag } from '@ethersproject/providers'
import { L2ToL1MessageReader } from '@arbitrum/sdk'

import { getETHWithdrawals as graph_getETHWithdrawals } from './graph'

/**
 * Fetches initiated ETH withdrawals from subgraph in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.address Account address
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l1NetworkId Chain id for the corresponding L1 network
 */
export function fetchETHWithdrawalsFromSubgraph({
  address,
  fromBlock,
  toBlock,
  // TODO: Change this to the L2 network once we have all subgraphs up
  l1NetworkId
}: {
  address: string
  fromBlock: number
  toBlock: number
  l1NetworkId: number
}) {
  return graph_getETHWithdrawals(
    address,
    fromBlock,
    toBlock,
    String(l1NetworkId)
  )
}

/**
 * Fetches initiated ETH withdrawals from event logs in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.address Account address
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2Provider Provider for the L2 network
 */
export function fetchETHWithdrawalsFromEventLogs({
  address,
  fromBlock,
  toBlock,
  l2Provider
}: {
  address: string
  fromBlock: BlockTag
  toBlock: BlockTag
  l2Provider: Provider
}) {
  return L2ToL1MessageReader.getEventLogs(
    l2Provider,
    { fromBlock, toBlock },
    undefined,
    address
  )
}
