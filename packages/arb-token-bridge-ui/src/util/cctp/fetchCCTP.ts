import { ChainId } from '../networks'
import { getAPIBaseUrl, sanitizeQueryParams } from '..'

export type FetchParams = {
  walletAddress: string
  l1ChainId: ChainId
}

export const fetchCCTPDeposits = async ({
  walletAddress,
  l1ChainId
}: FetchParams): Promise<[]> => {
  const urlParams = new URLSearchParams(
    sanitizeQueryParams({
      walletAddress,
      l1ChainId
    })
  )

  const response = await fetch(
    `${getAPIBaseUrl()}/api/cctp/deposits?${urlParams}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  )

  const deposits = (await response.json()).data
  return deposits
}

export const fetchCCTPWithdrawals = async ({
  walletAddress,
  l1ChainId
}: FetchParams): Promise<[]> => {
  const urlParams = new URLSearchParams(
    sanitizeQueryParams({
      walletAddress,
      l1ChainId
    })
  )

  const response = await fetch(
    `${getAPIBaseUrl()}/api/cctp/withdrawals?${urlParams}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }
  )

  const withdrawals = (await response.json()).data
  return withdrawals
}
