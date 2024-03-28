import axios from 'axios'
import dayjs from 'dayjs'
import { NextApiRequest, NextApiResponse } from 'next'

type ArbitrumStatusResponse = {
  meta: {
    timestamp: string
  }
  content: {
    components?: {
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

let cachedResult: ArbitrumStatusResponse | null = null
const originalTime = dayjs()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{
    data: ArbitrumStatusResponse | undefined
    message?: string
  }>
) {
  // validate method
  if (req.method !== 'GET') {
    res
      .status(400)
      .send({ message: `invalid_method: ${req.method}`, data: undefined })
    return
  }

  const currentTime = dayjs()

  if (cachedResult !== null && currentTime.diff(originalTime, 'minutes') < 5) {
    res.status(200).json({ data: cachedResult })
    return
  }

  const _statusSummary = (await axios.get(STATUS_URL)).data
  const resultJson = {
    meta: {
      timestamp: new Date().toISOString()
    },
    content: _statusSummary
  }
  cachedResult = resultJson
  res.status(200).json({ data: resultJson })
}
