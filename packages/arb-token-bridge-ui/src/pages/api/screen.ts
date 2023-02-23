import { NextApiRequest, NextApiResponse } from 'next'

function loadEnvironmentVariable(key: string): string {
  const value = process.env[key]

  if (typeof value === 'undefined') {
    throw new Error(`Missing "${key}" environment variable`)
  }

  return value
}

const apiEndpoint = loadEnvironmentVariable('SCREENING_API_ENDPOINT')
const apiKey = loadEnvironmentVariable('SCREENING_API_KEY')

const basicAuth = Buffer.from(`${apiKey}:${apiKey}`).toString('base64')

type ExternalApiResponse = [
  {
    chain: 'ethereum'
    addressRiskIndicators: [{ categoryRiskScoreLevel: number }]
  },
  {
    chain: 'arbitrum'
    addressRiskIndicators: [{ categoryRiskScoreLevel: number }]
  }
]

// todo: double-check criteria
function isBlocked(response: ExternalApiResponse): boolean {
  return response.some(screened => screened.addressRiskIndicators.length > 0)
}

export type ApiResponse = { blocked: boolean }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    res.status(400)
    return
  }

  const requestData = [
    { address: req.body.address, chain: 'ethereum' },
    { address: req.body.address, chain: 'arbitrum' }
  ]

  // todo: retry a couple of times in case of error?
  try {
    const response: ExternalApiResponse = await (
      await fetch(apiEndpoint, {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json'
        }
      })
    ).json()

    res.status(200).send({ blocked: isBlocked(response) })
  } catch (error) {
    res.status(200).send({ blocked: false })
  }
}
