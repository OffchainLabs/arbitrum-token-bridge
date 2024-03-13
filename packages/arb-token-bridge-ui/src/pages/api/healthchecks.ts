import { NextApiRequest, NextApiResponse } from 'next'

const ONE_HOUR_IN_SECONDS = 60 * 60

type Request = NextApiRequest

export type HealthCheckResponse = { isArbiscanDown: boolean }

export default async function handler(
  req: Request,
  res: NextApiResponse<{
    data: HealthCheckResponse | undefined
    message?: string
  }>
) {
  try {
    // validate method
    if (req.method !== 'GET') {
      res
        .status(400)
        .send({ message: `invalid_method: ${req.method}`, data: undefined })
      return
    }

    // get `isArbiscanDown` from the real API later
    const isArbiscanDown = true

    // https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching#cache-control
    // https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching#recommended-cache-control
    res.setHeader('Cache-Control', `max-age=0, s-maxage=${ONE_HOUR_IN_SECONDS}`)

    res.status(200).json({ data: { isArbiscanDown } })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: undefined
    })
  }
}
