import { Provider, BlockTag } from '@ethersproject/providers'
import { Erc20Bridger } from '@arbitrum/sdk'

/**
 * Fetches initiated token withdrawals from event logs in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.fromAddress Address that initiated the withdrawal
 * @param query.toAddress Address that will receive the funds
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2Provider Provider for the L2 network
 * @param query.l2GatewayAddresses L2 gateway addresses to use
 */
export async function fetchTokenWithdrawalsFromEventLogs({
  fromAddress,
  toAddress,
  fromBlock,
  toBlock,
  l2Provider,
  l2GatewayAddresses = []
}: {
  fromAddress?: string
  toAddress?: string
  fromBlock: BlockTag
  toBlock: BlockTag
  l2Provider: Provider
  l2GatewayAddresses?: string[]
}) {
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)

  return (
    await Promise.all(
      l2GatewayAddresses.map(gatewayAddress =>
        erc20Bridger.getL2WithdrawalEvents(
          l2Provider,
          gatewayAddress,
          { fromBlock, toBlock },
          undefined,
          fromAddress,
          toAddress
        )
      )
    )
  ).flat()
}
