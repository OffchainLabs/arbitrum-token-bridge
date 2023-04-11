// Connects to Arbiscan and scrapes some nice info (currently only TPS) which we can show on our UI as well

import axios from 'axios'
import { load } from 'cheerio'

import { NextApiRequest, NextApiResponse } from 'next'
import { getExplorerUrl, isNetwork } from 'src/util/networks'

// Extending the standard NextJs request with Deposit-params
type NextApiRequestWithArbStatsParams = NextApiRequest & {
  query: {
    l2ChainId: string
  }
}

export type ArbStats = {
  tps: string
}

type StatsResponse = {
  data: ArbStats
  message?: string // in case of any error
}

const emptyStats: ArbStats = { tps: '' }

export default async function handler(
  req: NextApiRequestWithArbStatsParams,
  res: NextApiResponse<StatsResponse>
) {
  try {
    // validate method
    if (req.method !== 'GET') {
      res
        .status(400)
        .send({ message: `invalid_method: ${req.method}`, data: emptyStats })
      return
    }

    const { l2ChainId } = req.query

    // validate the request parameters
    const errorMessage = []
    if (!l2ChainId) errorMessage.push('<l2ChainId> is required')

    if (errorMessage.length) {
      res.status(400).json({
        message: `incomplete request: ${errorMessage.join(', ')}`,
        data: emptyStats
      })
    }

    // if the network is not ArbOne or Nova, then we don't have the required stats on the explorer
    // don't unnecessarily call fetch function. return empty stats.
    if (isNetwork(Number(l2ChainId)).isTestnet) {
      res.status(200).json({
        data: emptyStats
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const response = await axios.get(getExplorerUrl(Number(l2ChainId))!)

    // Get the HTML code of the webpage
    const html = response.data

    const $ = load(html)

    const tpsElement = $(
      'span[title="Transactions per Second - Adjusted for Arbitrum Nitro system txs"]'
    )
    const tps = (tpsElement?.text() || '').trim().replace(/[()]/g, '')

    if (tps) res.setHeader('Cache-Control', 'max-age=60, public')
    res.status(200).json({
      data: { tps }
    })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: emptyStats
    })
  }
}
