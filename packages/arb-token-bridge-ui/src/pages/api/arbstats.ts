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

    // if the network is not supported by the bridge UI, then return 400
    if (!isNetwork(Number(l2ChainId)).isSupported) {
      res.status(400).json({
        message: `unsupported network type: ${l2ChainId}`,
        data: emptyStats
      })
      return
    }

    // if network is supported by bridge, but our TPS call doesn't support it, don't fetch it, 200 OK but return null data
    const canFetchTPS =
      isNetwork(Number(l2ChainId)).isArbitrumNova ||
      isNetwork(Number(l2ChainId)).isArbitrumOne

    if (!canFetchTPS) {
      res.status(200).json({
        data: emptyStats
      })
      return
    }

    // url from where we'll fetch stats
    const explorerUrl = getExplorerUrl(Number(l2ChainId))

    // for 403 or CORS blocked errors while scraping external endpoints, we use cors-proxy
    const finalUrl = `https://corsproxy.io/?${encodeURIComponent(explorerUrl!)}`

    const response = await axios.get(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Origin: explorerUrl,
        'Access-Control-Allow-Origin': '*'
      }
    })

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

    if (tps) {
      // https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching#cache-control
      // https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching#recommended-cache-control
      res.setHeader('Cache-Control', 'max-age=0, s-maxage=60')
    }
    res.status(200).json({
      data: { tps: isNaN(Number(tps)) ? null : Number(tps) }
    })
  } catch (error: any) {
    console.log('Error found -', error)
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: error
    })
  }
}
