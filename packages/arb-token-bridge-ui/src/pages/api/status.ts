import axios from 'axios'
import { NextApiRequest, NextApiResponse } from 'next'

export type ArbitrumStatusResponse = {
  content: {
    components: {
      id: string
      name: string
      description: string
      status:
        | 'UNDERMAINTENANCE'
        | 'OPERATIONAL'
        | 'DEGRADEDPERFORMANCE'
        | 'PARTIALOUTAGE'
        | 'MAJOROUTAGE'
    }[]
  }
}

const STATUS_URL = 'https://status.arbitrum.io/v2/components.json'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{
    data: ArbitrumStatusResponse | undefined
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

    const statusSummary = (await axios.get(STATUS_URL)).data
    const resultJson = {
      meta: {
        timestamp: new Date().toISOString()
      },
      content: statusSummary
    }

    res.setHeader('Cache-Control', `max-age=0, s-maxage=${10 * 60}`) // cache response for 10 minutes
    res.status(200).json({ data: resultJson as ArbitrumStatusResponse })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: undefined
    })
  }
}
