import { Provider } from '@ethersproject/providers'
import {
  fetchEthTeleportsFromSubgraph,
  FetchEthTeleportsFromSubgraphResult
} from './fetchEthTeleportsFromSubgraph'

import {
  fetchErc20TeleportsFromSubgraph,
  FetchErc20TeleportsFromSubgraphResult
} from './fetchErc20TeleportsFromSubgraph'
import { getL2ConfigForTeleport } from '../../token-bridge-sdk/teleport'

export type FetchTeleportsParams = {
  sender?: string
  receiver?: string
  fromBlock?: number
  toBlock?: number
  l1Provider: Provider
  l3Provider: Provider
  pageSize?: number
  pageNumber?: number
  searchString?: string
}

export type TeleportFromSubgraph =
  | FetchEthTeleportsFromSubgraphResult
  | FetchErc20TeleportsFromSubgraphResult

export const fetchTeleports = async ({
  sender,
  receiver,
  fromBlock,
  toBlock,
  l1Provider,
  l3Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: FetchTeleportsParams): Promise<TeleportFromSubgraph[]> => {
  if (typeof sender === 'undefined' && typeof receiver === 'undefined')
    return []
  if (!l1Provider || !l3Provider) return []

  const l1ChainId = (await l1Provider.getNetwork()).chainId
  const { l2ChainId } = await getL2ConfigForTeleport({
    destinationChainProvider: l3Provider
  })

  if (!fromBlock) {
    fromBlock = 0
  }

  let ethTeleportsFromSubgraph: FetchEthTeleportsFromSubgraphResult[] = []
  try {
    ethTeleportsFromSubgraph = await fetchEthTeleportsFromSubgraph({
      sender,
      receiver,
      fromBlock,
      toBlock,
      l2ChainId,
      pageSize,
      pageNumber,
      searchString
    })
  } catch (error: any) {
    console.log('Error fetching eth teleports from subgraph', error)
  }

  let erc20TeleportsFromSubgraph: FetchErc20TeleportsFromSubgraphResult[] = []
  try {
    erc20TeleportsFromSubgraph = await fetchErc20TeleportsFromSubgraph({
      sender,
      receiver,
      fromBlock,
      toBlock,
      l1ChainId,
      pageSize,
      pageNumber,
      searchString
    })
  } catch (error: any) {
    console.log('Error fetching erc20 teleports from subgraph', error)
  }

  const combinedTransfers = [
    ...ethTeleportsFromSubgraph,
    ...erc20TeleportsFromSubgraph
  ].sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))

  console.log('XXXX COMBINED', combinedTransfers)

  return combinedTransfers
}
