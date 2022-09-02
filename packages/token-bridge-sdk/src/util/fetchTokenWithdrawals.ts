import { Provider, BlockTag } from '@ethersproject/providers'
import { L2Network, Erc20Bridger } from '@arbitrum/sdk'

/**
 * Fetches initiated token withdrawals from event logs in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.address Account address
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2Network L2 network
 * @param query.l2Provider Provider for the L2 network
 * @param query.l2GatewayAddresses L2 gateway addresses to use
 */
export async function fetchTokenWithdrawalsFromEventLogs({
  address,
  fromBlock,
  toBlock,
  l2Network,
  l2Provider,
  l2GatewayAddresses
}: {
  address: string
  fromBlock: BlockTag
  toBlock: BlockTag
  l2Network: L2Network
  l2Provider: Provider
  l2GatewayAddresses: string[]
}) {
  const erc20Bridger = new Erc20Bridger(l2Network)

  return (
    await Promise.all(
      l2GatewayAddresses.map(gatewayAddress =>
        erc20Bridger.getL2WithdrawalEvents(
          l2Provider,
          gatewayAddress,
          { fromBlock, toBlock },
          undefined,
          address
        )
      )
    )
  ).flat()
}
