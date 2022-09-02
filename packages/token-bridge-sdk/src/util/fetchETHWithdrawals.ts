import { Provider, BlockTag } from '@ethersproject/providers'
import { L2ToL1MessageReader } from '@arbitrum/sdk'

import { getETHWithdrawals as graph_getETHWithdrawals } from './graph'

export function fetchETHWithdrawalsFromSubgraph({
  address,
  fromBlock,
  toBlock,
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
