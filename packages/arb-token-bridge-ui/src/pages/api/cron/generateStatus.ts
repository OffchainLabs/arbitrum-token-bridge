import fs from 'fs'
import axios from 'axios'
import { NextApiRequest, NextApiResponse } from 'next'

const STATUS_URL = 'https://status.arbitrum.io/v2/components.json'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ data: boolean | undefined; message?: string }>
) {
  // validate method
  if (req.method !== 'GET') {
    res
      .status(400)
      .send({ message: `invalid_method: ${req.method}`, data: undefined })
    return
  }

  const _statusSummary = (await axios.get(STATUS_URL)).data
  const resultJson =
    JSON.stringify(
      {
        meta: {
          timestamp: new Date().toISOString()
        },
        content: _statusSummary
      },
      null,
      2
    ) + '\n'
  fs.writeFileSync('./public/__auto-generated-status.json', resultJson)

  res.status(200).json({ data: true })
}
