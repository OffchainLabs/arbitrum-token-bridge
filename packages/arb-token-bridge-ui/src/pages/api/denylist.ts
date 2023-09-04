import { NextApiRequest, NextApiResponse } from 'next'
import denylist from '../../../public/__auto-generated-denylist.json'

const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7

type Request = NextApiRequest & { query: { address: string } }

export default async function handler(
  req: Request,
  res: NextApiResponse<{ data: boolean | undefined; message?: string }>
) {
  try {
    // validate method
    if (req.method !== 'GET') {
      res
        .status(400)
        .send({ message: `invalid_method: ${req.method}`, data: undefined })
      return
    }

    const { address } = req.query

    if (typeof address !== 'string') {
      res.status(400).send({
        message: `invalid_parameter: expected 'address' to be a string but got ${typeof address}`,
        data: undefined
      })
      return
    }

    const isDenylisted = new Set(denylist.content).has(address.toLowerCase())

    // https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching#cache-control
    // https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching#recommended-cache-control
    res.setHeader('Cache-Control', `max-age=0, s-maxage=${ONE_WEEK_IN_SECONDS}`)

    res.status(200).json({ data: isDenylisted })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: undefined
    })
  }
}
