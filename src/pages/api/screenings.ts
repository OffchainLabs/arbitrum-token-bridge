import { NextApiRequest, NextApiResponse } from 'next'
import { utils } from 'ethers'
import withRetry from 'fetch-retry'

function loadEnvironmentVariable(key: string): string {
  const value = process.env[key]

  if (typeof value === 'undefined') {
    throw new Error(`Missing "${key}" environment variable`)
  }

  return value
}

const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7

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

function isBlocked(response: ExternalApiResponse): boolean {
  // Block in case the address has any risk indicators on either network
  return response.some(result => result.addressRiskIndicators.length > 0)
}

export type ApiResponseSuccess = {
  blocked: boolean
}

export type ApiResponseError = {
  message: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponseSuccess | ApiResponseError>
) {
  if (req.method !== 'GET') {
    res.status(400).send({ message: 'invalid_method' })
    return
  }

  const address = req.query.address

  if (typeof address !== 'string' || !utils.isAddress(address)) {
    res.status(400).send({ message: 'invalid_address' })
    return
  }

  const requestData = [
    { address, chain: 'ethereum' },
    { address, chain: 'arbitrum' }
  ]

  const response = await withRetry(fetch)(apiEndpoint, {
    method: 'POST',
    body: JSON.stringify(requestData),
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json'
    },
    // fetch-retry (https://github.com/jonbern/fetch-retry)
    retryOn: (attempt, error, response) => {
      // Retry 3 times
      if (attempt > 2) {
        return false
      }

      // Retry in case of a network error or if the request isn't successful
      if (error || (response && response.status >= 400)) {
        return true
      }

      return false
    }
  })

  if (!response.ok) {
    res.status(200).send({ blocked: false })
    return
  }

  // https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching#cache-control
  // https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching#recommended-cache-control
  res.setHeader('Cache-Control', `max-age=0, s-maxage=${ONE_WEEK_IN_SECONDS}`)

  res.status(200).send({
    blocked: isBlocked((await response.json()) as ExternalApiResponse)
  })
}
