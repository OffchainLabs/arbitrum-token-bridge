import { NextApiRequest, NextApiResponse } from 'next'
import { isNetwork } from '../../../util/networks'

// Extending the standard NextJs request with Deposit-params
type NextApiRequestWithAttestationParams = NextApiRequest & {
  query: {
    attestationHash: `0x${string}`
    sourceChainId: string
  }
}

export type AttestationResponse =
  | {
      attestation: `0x${string}`
      status: 'complete'
    }
  | {
      attestation: null
      status: 'pending_confirmations'
    }
  | {
      attestation: null
      status: null
      message: string
    }

export default async function handler(
  req: NextApiRequestWithAttestationParams,
  res: NextApiResponse<AttestationResponse>
) {
  try {
    const { attestationHash, sourceChainId } = req.query

    // validate method
    if (req.method !== 'GET') {
      res.status(400).send({
        message: `invalid_method: ${req.method}`,
        attestation: null,
        status: null
      })
      return
    }

    // validate the request parameters
    const errorMessage = []
    if (!sourceChainId) errorMessage.push('<sourceChainId> is required')
    if (!attestationHash) errorMessage.push('<attestationHash> is required')

    if (errorMessage.length) {
      res.status(400).json({
        message: `incomplete request: ${errorMessage.join(', ')}`,
        attestation: null,
        status: null
      })
      return
    }

    const { isTestnet } = isNetwork(parseInt(sourceChainId, 10))
    const attestationApiUrl = isTestnet
      ? 'https://iris-api-sandbox.circle.com/v1'
      : 'https://iris-api.circle.com/v1'

    const response = await fetch(
      `${attestationApiUrl}/attestations/${attestationHash}`,
      { method: 'GET', headers: { accept: 'application/json' } }
    )
    const attestationResponse: AttestationResponse = await response.json()

    res.status(200).json(attestationResponse)
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      attestation: null,
      status: null
    })
  }
}
