import { ChainId } from '../networks'
import { getAPIBaseUrl, sanitizeQueryParams } from '..'
import { Response } from '../../pages/api/cctp/[type]'
import { utils } from 'ethers'

export type FetchParams = {
  walletAddress: string
  l1ChainId: ChainId
  pageNumber: number
  pageSize: number
}

function convertStringToUsdcBigNumber(amount: string) {
  return utils.formatUnits(amount, 6)
}
async function fetchCCTP({
  walletAddress,
  l1ChainId,
  pageNumber,
  pageSize,
  type
}: FetchParams & { type: 'deposits' | 'withdrawals' }) {
  const urlParams = new URLSearchParams(
    sanitizeQueryParams({
      walletAddress,
      l1ChainId,
      pageNumber,
      pageSize
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
  const { pending, completed } = parsedResponse.data
  return {
    pending: pending.map(pendingTransfer => {
      pendingTransfer.messageSent.amount = convertStringToUsdcBigNumber(
        pendingTransfer.messageSent.amount ?? '0'
      )
      return pendingTransfer
    }),
    completed: completed.map(completedTransfer => {
      completedTransfer.messageSent.amount = convertStringToUsdcBigNumber(
        completedTransfer.messageSent.amount ?? '0'
      )
      return completedTransfer
    })
  }
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
