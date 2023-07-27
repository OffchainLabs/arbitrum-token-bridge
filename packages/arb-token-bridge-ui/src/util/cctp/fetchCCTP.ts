import { ChainId } from '../networks'
import { getAPIBaseUrl, sanitizeQueryParams } from '..'
import { Response } from '../../pages/api/cctp/[type]'

export type FetchParams = {
  walletAddress: string
  l1ChainId: ChainId
}

async function fetchCCTP({
  walletAddress,
  l1ChainId,
  type
}: FetchParams & {
  type: 'deposits' | 'withdrawals'
}) {
  const urlParams = new URLSearchParams(
    sanitizeQueryParams({
      walletAddress,
      l1ChainId
    })
  )

  const response = await fetch(
    `${getAPIBaseUrl()}/api/cctp/${type}?${urlParams}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  )

  const parsedResponse: Response = await response.json()
  return parsedResponse
}

export async function fetchCCTPDeposits(
  params: FetchParams
): Promise<Response> {
  return fetchCCTP({ ...params, type: 'deposits' })
}

export async function fetchCCTPWithdrawals(
  params: FetchParams
): Promise<Response> {
  return fetchCCTP({ ...params, type: 'withdrawals' })
}
