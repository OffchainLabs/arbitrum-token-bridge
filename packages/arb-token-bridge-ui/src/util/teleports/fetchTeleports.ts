import { Provider } from '@ethersproject/providers'

import {
  getL2ConfigForTeleport,
  isValidTeleportChainPair
} from '../../token-bridge-sdk/teleport'
import { getChainIdFromProvider } from '../../token-bridge-sdk/utils'
import {
  fetchErc20TeleportsFromSubgraph,
  FetchErc20TeleportsFromSubgraphResult
} from './fetchErc20TeleportsFromSubgraph'
import {
  fetchEthTeleportsFromSubgraph,
  FetchEthTeleportsFromSubgraphResult
} from './fetchEthTeleportsFromSubgraph'

export type FetchTeleportsParams = {
  sender?: string
  receiver?: string
  fromBlock?: number
  toBlock?: number
  parentChainProvider: Provider
  childChainProvider: Provider
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
  parentChainProvider, // l1 provider
  childChainProvider, // l3 provider
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: FetchTeleportsParams): Promise<TeleportFromSubgraph[]> => {
  if (typeof sender === 'undefined' && typeof receiver === 'undefined')
    return []

  if (!parentChainProvider || !childChainProvider) return []

  const l1ChainId = await getChainIdFromProvider(parentChainProvider)
  const l3ChainId = await getChainIdFromProvider(childChainProvider)

  // don't query if not a valid teleport configuration
  if (
    !isValidTeleportChainPair({
      sourceChainId: l1ChainId,
      destinationChainId: l3ChainId
    })
  ) {
    console.error(
      `Error fetching teleports from subgraph: invalid source and destination chain ids: ${l1ChainId} -> ${l3ChainId}`
    )
    return []
  }

  const { l2ChainId } = await getL2ConfigForTeleport({
    destinationChainProvider: childChainProvider
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
      l1ChainId,
      l2ChainId,
      l3ChainId,
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
      fromBlock,
      toBlock,
      l1ChainId,
      pageSize,
      pageNumber
    })
  } catch (error: any) {
    console.log('Error fetching erc20 teleports from subgraph', error)
  }

  const combinedTeleports: TeleportFromSubgraph[] = [
    ...ethTeleportsFromSubgraph,
    ...erc20TeleportsFromSubgraph
  ]

  return combinedTeleports
}
