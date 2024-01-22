import axios from 'axios'
import dayjs from 'dayjs'
import { NextApiRequest, NextApiResponse } from 'next'

const ETH_PRICE_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'

const THROTTLE_TIME_MINS = 5

let lastFetchedPrice: number | undefined
let lastFetchTimeStamp: number | undefined

type Request = NextApiRequest

export default async function handler(
  req: Request,
  res: NextApiResponse<{ data: number; message?: string }>
) {
  try {
    // validate method
    if (req.method !== 'GET') {
      res
        .status(400)
        .send({ message: `invalid_method: ${req.method}`, data: 0 })
      return
    }

    const now = dayjs()
    if (
      lastFetchTimeStamp &&
      lastFetchedPrice &&
      now.diff(lastFetchTimeStamp, 'minutes') < THROTTLE_TIME_MINS
    ) {
      res.status(200).send({
        data: lastFetchedPrice,
        message: `cached price fetched on ${lastFetchTimeStamp}`
      })
      return
    }

    const { data } = await axios.get(ETH_PRICE_URL)
    lastFetchedPrice = Number(data.ethereum.usd)
    lastFetchTimeStamp = now.valueOf()

    // https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching#cache-control
    // https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching#recommended-cache-control
    res.setHeader(
      'Cache-Control',
      `max-age=0, s-maxage=${THROTTLE_TIME_MINS * 60}`
    )

    res.status(200).json({
      data: lastFetchedPrice,
      message: `new price fetched on ${lastFetchTimeStamp}`
    })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: 0
    })
  }
}
