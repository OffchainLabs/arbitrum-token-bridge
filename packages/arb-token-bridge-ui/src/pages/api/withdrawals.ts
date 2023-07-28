import { NextApiRequest, NextApiResponse } from 'next'
import { gql } from '@apollo/client'
import { FetchWithdrawalsFromSubgraphResult } from '../../util/withdrawals/fetchWithdrawalsFromSubgraph'
import { getL2SubgraphClient } from '../../util/SubgraphUtils'

// Extending the standard NextJs request with Withdrawal-params
type NextApiRequestWithWithdrawalParams = NextApiRequest & {
  query: {
    l2ChainId: string
    search?: string
    sender?: string
    senderNot?: string
    receiver?: string
    receiverNot?: string
    page?: string
    pageSize?: string
    fromBlock?: string
    toBlock?: string
  }
}

type WithdrawalResponse = {
  data: FetchWithdrawalsFromSubgraphResult[]
  message?: string // in case of any error
}

export default async function handler(
  req: NextApiRequestWithWithdrawalParams,
  res: NextApiResponse<WithdrawalResponse>
) {
  try {
    const {
      search = '',
      l2ChainId,
      sender,
      senderNot,
      receiver,
      receiverNot,
      page = '0',
      pageSize = '10',
      fromBlock,
      toBlock
    } = req.query

    // validate method
    if (req.method !== 'GET') {
      res
        .status(400)
        .send({ message: `invalid_method: ${req.method}`, data: [] })
      return
    }

    // validate the request parameters
    const errorMessage = []
    if (!l2ChainId) errorMessage.push('<l2ChainId> is required')
    if (!sender && !receiver)
      errorMessage.push('<sender> or <receiver> is required')

    if (errorMessage.length) {
      res.status(400).json({
        message: `incomplete request: ${errorMessage.join(', ')}`,
        data: []
      })
    }

    const subgraphResult = await getL2SubgraphClient(Number(l2ChainId)).query({
      query: gql`{
            withdrawals(
                where: {
                ${sender ? `sender: "${sender}",` : ''}
                ${senderNot ? `sender_not: "${senderNot}",` : ''}
                ${receiver ? `receiver: "${receiver}",` : ''}
                ${receiverNot ? `receiver_not: "${receiverNot}",` : ''}
                ${
                  typeof fromBlock !== 'undefined'
                    ? `l2BlockNum_gte: ${Number(fromBlock)}`
                    : ''
                }
                  ${
                    typeof toBlock !== 'undefined'
                      ? `l2BlockNum_lte: ${Number(toBlock)}`
                      : ''
                  }  
                  ${search ? `l2TxHash_contains: "${search}"` : ''}
                }
                orderBy: l2BlockTimestamp
                orderDirection: desc
                first: ${Number(pageSize)},
                skip: ${Number(page) * Number(pageSize)}
            ) {
                id,
                type,
                sender,
                receiver,
                ethValue,
                l1Token {
                    id
                },
                tokenAmount,
                isClassic,
                l2BlockTimestamp,
                l2TxHash,
                l2BlockNum
            }
        }`
    })

    const transactions: FetchWithdrawalsFromSubgraphResult[] =
      subgraphResult.data.withdrawals.map((eventData: any) => {
        const {
          id,
          type,
          sender,
          receiver,
          ethValue,
          l1Token,
          tokenAmount,
          isClassic,
          l2BlockTimestamp,
          l2TxHash,
          l2BlockNum
        } = eventData

        return {
          id,
          type,
          sender,
          receiver,
          ethValue,
          l1Token,
          tokenAmount,
          isClassic,
          l2BlockTimestamp,
          l2TxHash,
          l2BlockNum
        }
      })

    res.status(200).json({ data: transactions })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: []
    })
  }
}
