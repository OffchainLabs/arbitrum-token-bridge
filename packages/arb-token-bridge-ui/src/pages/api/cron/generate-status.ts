import axios from 'axios'
import dayjs from 'dayjs'
import { NextApiRequest, NextApiResponse } from 'next'

type ArbitrumStatusResponse = {
  meta: {
    timestamp: string
    source: 'api' | 'cache'
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

  // return the cached result if it's less than 1 minute old
  if (cachedResult !== null && dayjs().diff(originalTime, 'minutes') < 1) {
    res.status(200).json({ data: cachedResult })
    return
  }

  // fetch the status summary if the cached result is older than 1 minute
  const _statusSummary = (await axios.get(STATUS_URL)).data
  const resultJson = {
    meta: {
      source: 'api',
      timestamp: new Date().toISOString()
    },
    content: _statusSummary
  }
  cachedResult = {
    ...resultJson,
    meta: { ...resultJson.meta, source: 'cache' }
  }

  res.status(200).json({ data: resultJson as ArbitrumStatusResponse })
}
