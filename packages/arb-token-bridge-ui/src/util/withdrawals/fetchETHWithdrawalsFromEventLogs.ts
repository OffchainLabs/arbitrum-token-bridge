import { Provider, BlockTag } from '@ethersproject/providers'
import { L2ToL1MessageReader } from '@arbitrum/sdk'

/**
 * Fetches initiated ETH withdrawals from event logs in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.toAddress Address that will receive the funds
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2Provider Provider for the L2 network
 */
export async function fetchETHWithdrawalsFromEventLogs({
  address,
  fromBlock,
  toBlock,
  l2Provider
}: {
  address?: string
  fromBlock: BlockTag
  toBlock: BlockTag
  l2Provider: Provider
}) {
  // gets txs to the same address
  return L2ToL1MessageReader.getL2ToL1Events(
    l2Provider,
    { fromBlock, toBlock },
    undefined,
    address
  )
}
