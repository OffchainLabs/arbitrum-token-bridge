import axios from 'axios'
import Cors from 'cors'
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

// Initializing the cors middleware
// You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
const cors = Cors({
  methods: ['POST', 'GET', 'HEAD']
})

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }

      return resolve(result)
    })
  })
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

    // Run the middleware
    await runMiddleware(req, res, cors)

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
