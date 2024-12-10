import { Provider } from '@ethersproject/providers'
import { utils } from 'ethers'

import {
  fetchDepositsFromSubgraph,
  FetchDepositsFromSubgraphResult
} from './fetchDepositsFromSubgraph'
import { AssetType } from '../../hooks/arbTokenBridge.types'
import { Transaction } from '../../hooks/useTransactions'
import { fetchNativeCurrency } from '../../hooks/useNativeCurrency'
import {
  fetchEthDepositsToCustomDestinationFromSubgraph,
  FetchEthDepositsToCustomDestinationFromSubgraphResult
} from './fetchEthDepositsToCustomDestinationFromSubgraph'
import { mapDepositsFromSubgraph } from './mapDepositsFromSubgraph'

export type FetchDepositParams = {
  sender?: string
  receiver?: string
  fromBlock?: number
  toBlock?: number
  l1Provider: Provider
  l2Provider: Provider
  pageSize?: number
  pageNumber?: number
  searchString?: string
}

/* Fetch complete deposits - both ETH and Token deposits from subgraph into one list */
/* Also fills in any additional data required per transaction for our UI logic to work well */
/* TODO : Add event logs as well */
export const fetchDeposits = async ({
  sender,
  receiver,
  fromBlock,
  toBlock,
  l1Provider,
  l2Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: FetchDepositParams): Promise<Transaction[]> => {
  if (typeof sender === 'undefined' && typeof receiver === 'undefined')
    return []
  if (!l1Provider || !l2Provider) return []

  const l1ChainId = (await l1Provider.getNetwork()).chainId
  const l2ChainId = (await l2Provider.getNetwork()).chainId

  const nativeCurrency = await fetchNativeCurrency({ provider: l2Provider })

  if (!fromBlock) {
    fromBlock = 0
  }

  let depositsFromSubgraph: FetchDepositsFromSubgraphResult[] = []
  let ethDepositsToCustomDestinationFromSubgraph: FetchEthDepositsToCustomDestinationFromSubgraphResult[] =
    []

  const subgraphParams = {
    sender,
    receiver,
    fromBlock,
    toBlock,
    l2ChainId,
    pageSize,
    pageNumber,
    searchString
  }

  try {
    depositsFromSubgraph = await fetchDepositsFromSubgraph(subgraphParams)
  } catch (error: any) {
    console.log('Error fetching deposits from subgraph', error)
  }

  try {
    ethDepositsToCustomDestinationFromSubgraph =
      await fetchEthDepositsToCustomDestinationFromSubgraph(subgraphParams)
  } catch (error: any) {
    console.log(
      'Error fetching native token deposits to custom destination from subgraph',
      error
    )
  }

  const mappedDepositsFromSubgraph: Transaction[] = mapDepositsFromSubgraph({
    depositsFromSubgraph,
    nativeCurrency,
    l1ChainId,
    l2ChainId
  })

  const mappedEthDepositsToCustomDestinationFromSubgraph: Transaction[] =
    ethDepositsToCustomDestinationFromSubgraph.map(
      (tx: FetchEthDepositsToCustomDestinationFromSubgraphResult) => {
        return {
          type: 'deposit-l1',
          status: 'pending',
          direction: 'deposit',
          source: 'subgraph',
          value: utils.formatUnits(tx.ethValue, nativeCurrency.decimals),
          txID: tx.transactionHash,
          sender: tx.sender,
          destination: tx.receiver,

          assetName: nativeCurrency.symbol,
          assetType: AssetType.ETH,

          l1NetworkID: String(l1ChainId),
          l2NetworkID: String(l2ChainId),
          blockNumber: Number(tx.blockCreatedAt),
          timestampCreated: tx.timestamp,
          isClassic: false,

          childChainId: l2ChainId,
          parentChainId: l1ChainId
        }
      }
    )

  return [
    ...mappedDepositsFromSubgraph,
    ...mappedEthDepositsToCustomDestinationFromSubgraph
  ].sort((a, b) => Number(b.timestampCreated) - Number(a.timestampCreated))
}
