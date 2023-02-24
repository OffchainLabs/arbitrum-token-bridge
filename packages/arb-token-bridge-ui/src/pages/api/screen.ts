import { NextApiRequest, NextApiResponse } from 'next'
import { utils } from 'ethers'

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
  if (req.method !== 'POST') {
    res.status(400).send({ message: 'invalid_method' })
    return
  }

  const address = req.body.address

  if (typeof address !== 'string' || !utils.isAddress(address)) {
    res.status(400).send({ message: 'invalid_address' })
    return
  }

  const requestData = [
    { address, chain: 'ethereum' },
    { address, chain: 'arbitrum' }
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
