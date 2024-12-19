import { getArbitrumNetworks } from '@arbitrum/sdk'
import { Address } from 'wagmi'

import { FetchDepositsFromSubgraphResult } from './fetchDepositsFromSubgraph'
import { getAPIBaseUrl, sanitizeQueryParams } from '..'
import { hasL1Subgraph } from '../SubgraphUtils'
import { getNetworkName } from '../networks'
import { fetchNativeCurrency } from '../../hooks/useNativeCurrency'
import { mapDepositsFromSubgraph } from './mapDepositsFromSubgraph'
import { Transaction } from '../../types/Transactions'

import { getProviderForChainId } from '@/token-bridge-sdk/utils'

/**
 * Fetches initiated ETH deposit from event logs using transaction id
 *
 * @param txHash transaction id on parent chain
 */
export async function fetchDepositTxFromSubgraph(
  txHash: string,
  connectedAddress: Address
): Promise<Transaction[] | undefined> {
  const supportedChildChains = getArbitrumNetworks()

  const fetcherList = supportedChildChains.map(childChain => {
    const childChainId = childChain.chainId

    if (!hasL1Subgraph(Number(childChainId))) {
      console.error(
        `Parent chain subgraph not available for network: ${getNetworkName(
          childChainId
        )} (${childChainId})`
      )
      return undefined
    }

    const urlParams = new URLSearchParams(
      sanitizeQueryParams({
        search: txHash,
        l2ChainId: childChainId,
        sender: connectedAddress
      })
    )

    return {
      fetcher: fetch(`${getAPIBaseUrl()}/api/deposits?${urlParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }),
      parentChainId: childChain.parentChainId,
      childChainId
    }
  })

  try {
    const responses = await Promise.all(fetcherList.map(item => item?.fetcher))

    // there is always only one response because this tx only lives on one chain and no collision is possible
    const results = responses
      .map((response, index) => {
        const fetcherItem = fetcherList[index]
        if (typeof fetcherItem === 'undefined') {
          return undefined
        }
        return {
          response,
          parentChainId: fetcherItem.parentChainId,
          childChainId: fetcherItem.childChainId
        }
      })
      .filter(Boolean) as {
      response: Response
      parentChainId: number
      childChainId: number
    }[]

    type DepositFromSubgraph = {
      data: FetchDepositsFromSubgraphResult[]
      parentChainId: number
      childChainId: number
    }

    const depositsFromSubgraph: DepositFromSubgraph[] = (
      await Promise.all(results.map(result => result.response.json()))
    )
      .map((result, index) => ({
        data: result.data,
        parentChainId: results[index]?.parentChainId,
        childChainId: results[index]?.childChainId
      }))
      .filter(
        (result): result is DepositFromSubgraph =>
          result.data.length > 0 &&
          typeof result.parentChainId !== 'undefined' &&
          typeof result.childChainId !== 'undefined'
      )
    console.log('depositsFromSubgraph? ', depositsFromSubgraph)

    if (typeof depositsFromSubgraph[0] === 'undefined') {
      return
    }

    const nativeCurrency = await fetchNativeCurrency({
      provider: getProviderForChainId(depositsFromSubgraph[0].childChainId)
    })

    const mappedDepositsFromSubgraph: Transaction[] = mapDepositsFromSubgraph({
      depositsFromSubgraph: depositsFromSubgraph[0].data,
      nativeCurrency,
      l1ChainId: depositsFromSubgraph[0].parentChainId,
      l2ChainId: depositsFromSubgraph[0].childChainId
    })

    return mappedDepositsFromSubgraph
  } catch (error) {
    return undefined
  }
}
