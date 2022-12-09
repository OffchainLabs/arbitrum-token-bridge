import { gql } from '@apollo/client'
import { utils, BigNumber } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { L2TransactionReceipt } from '@arbitrum/sdk'
import { L2ToL1TransactionEvent } from '@arbitrum/sdk/dist/lib/message/L2ToL1Message'

import { getL2SubgraphClient } from '../util/subgraph'

// TODO: Codegen types
type GatewayWithdrawalData = {
  l2TxHash: string
  amount: string
}

type QueryResult = {
  data: {
    gatewayWithdrawalDatas: GatewayWithdrawalData[]
  }
}

export type FetchTokenWithdrawalsFromSubgraphResult = L2ToL1TransactionEvent & {
  l2TxHash: string
  amount: BigNumber
  tokenAddress: string
}

// TODO: We could move this as it might be useful elsewhere
function filterOutNullValuesFromArray<TNotNull>(
  array: (TNotNull | null)[]
): TNotNull[] {
  return array.filter(
    (element: TNotNull | null): element is TNotNull => element !== null
  )
}

/**
 * Fetches initiated token withdrawals from subgraph in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.address Account address
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2Provider Provider for the L2 network
 */
export async function fetchTokenWithdrawalsFromSubgraph({
  address,
  fromBlock,
  toBlock,
  l2Provider
}: {
  address: string
  fromBlock: number
  toBlock: number
  l2Provider: Provider
}): Promise<FetchTokenWithdrawalsFromSubgraphResult[]> {
  if (fromBlock === 0 && toBlock === 0) {
    return []
  }

  const l2ChainId = (await l2Provider.getNetwork()).chainId

  const queryResult: QueryResult = await getL2SubgraphClient(l2ChainId).query({
    query: gql`
        {
          gatewayWithdrawalDatas(
            where: {
              from: "${address}",
              l2BlockNum_gte: ${fromBlock},
              l2BlockNum_lte: ${toBlock}
            }
          ) {
            l2TxHash
            amount
          }
        }
      `
  })

  const result: (FetchTokenWithdrawalsFromSubgraphResult | null)[] =
    await Promise.all(
      queryResult.data.gatewayWithdrawalDatas.map(async data => {
        const { l2TxHash, amount: amountStringified } = data
        const amount = BigNumber.from(amountStringified)

        const txReceipt = await l2Provider.getTransactionReceipt(l2TxHash)

        // It's possible we can't fetch the receipt due to it being too old, and only available through an archival node
        //
        // TODO: Re-enable once we can support this
        if (txReceipt === null) {
          return null
        }

        const l2TxReceipt = new L2TransactionReceipt(txReceipt)

        const [l2ToL1Event] = l2TxReceipt.getL2ToL1Events()

        if (!l2ToL1Event) {
          return null
        }

        const tokenAddress = utils.hexDataSlice(l2ToL1Event.data, 16, 36)

        return {
          ...l2ToL1Event,
          l2TxHash,
          amount,
          tokenAddress
        }
      })
    )

  return filterOutNullValuesFromArray(result)
}
