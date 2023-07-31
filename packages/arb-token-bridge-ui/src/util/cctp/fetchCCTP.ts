import { ChainId } from '../networks'
import { getAPIBaseUrl, sanitizeQueryParams } from '..'
import { Response } from '../../pages/api/cctp/[type]'

export type FetchParams = {
  walletAddress: string
  sourceChainId: ChainId
}

async function fetchCCTP({
  walletAddress,
  sourceChainId,
  type
}: FetchParams & {
  type: 'deposits' | 'withdrawals'
}) {
  const urlParams = new URLSearchParams(
    sanitizeQueryParams({
      walletAddress,
      sourceChainId
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
  return parsedResponse.data
}

export async function fetchCCTPDeposits(
  params: FetchParams
): Promise<Response['data']> {
  return fetchCCTP({ ...params, type: 'deposits' })
}

export async function fetchCCTPWithdrawals(
  params: FetchParams
): Promise<Response['data']> {
  return fetchCCTP({ ...params, type: 'withdrawals' })
}
