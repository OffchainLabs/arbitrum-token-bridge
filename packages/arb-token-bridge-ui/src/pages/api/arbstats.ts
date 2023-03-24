// Connects to arbiscan and scrapes some nice info which we can show on our UI as well

const axios = require('axios')
const cheerio = require('cheerio')

import { NextApiRequest, NextApiResponse } from 'next'

const parseProperText = (text: string) => {
  return (
    text
      ?.replaceAll('\n', '')
      ?.split(' ')
      .filter((char: string) => char !== '')
      .join(' ') ?? ''
  )
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
  req: NextApiRequest,
  res: NextApiResponse<StatsResponse>
) {
  try {
    const response = await axios.get('https://arbiscan.io')

    // Get the HTML code of the webpage
    const html = response.data

    const $ = cheerio.load(html)

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
