import { Provider, BlockTag } from '@ethersproject/providers'
import { L2ToL1MessageReader } from '@arbitrum/sdk'

export async function fetchETHWithdrawalsFromEventLogs({
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
