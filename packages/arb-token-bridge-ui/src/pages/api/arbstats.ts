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
  tps: number | null
}

type StatsResponse = {
  data: ArbStats
  message?: string // in case of any error
}

const emptyStats: ArbStats = { tps: null }

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
      return
    }

    // url from where we'll fetch stats
    const explorerUrl = getExplorerUrl(Number(l2ChainId))

    // if the network is not supported by the bridge UI, then return 400
    if (!isNetwork(Number(l2ChainId)).isSupported || !explorerUrl) {
      res.status(400).json({
        message: `unsupported network type: ${l2ChainId}`,
        data: emptyStats
      })
      return
    }

    // if network is supported by bridge, but our TPS call doesn't support it, don't fetch it, 200 OK but return null data
    if (
      !(
        isNetwork(Number(l2ChainId)).isArbitrumNova ||
        isNetwork(Number(l2ChainId)).isArbitrumOne
      )
    ) {
      res.status(200).json({
        data: emptyStats
      })
      return
    }

    const response = await axios.get(explorerUrl)

    // Get the HTML code of the webpage
    const html = response.data

    const $ = load(html)

    const tpsElement = $(
      'span[title="Transactions per Second - Adjusted for Arbitrum Nitro system txs"]'
    )
    const tps = (tpsElement?.text() || '')
      .trim()
      .replace(/[()]/g, '')
      .split(' ')[0]

    if (tps) res.setHeader('Cache-Control', 'max-age=60, public')
    res.status(200).json({
      data: { tps: isNaN(Number(tps)) ? null : Number(tps) }
    })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: emptyStats
    })
  }
}
