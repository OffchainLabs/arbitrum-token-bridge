import { ChainId } from '../networks'
import { getAPIBaseUrl, sanitizeQueryParams } from '..'
import {
  CompletedCCTPTransfer,
  PendingCCTPTransfer,
  Response
} from '../../pages/api/cctp/[type]'
import { utils } from 'ethers'

export type FetchParams = {
  walletAddress?: string
  l1ChainId: ChainId
  pageNumber: number
  pageSize: number
  sourceChainTxHash?: string
}

function convertStringToUsdcBigNumber(amount: string) {
  return utils.formatUnits(amount, 6)
}
function mapCCTPTransfer<T extends PendingCCTPTransfer | CompletedCCTPTransfer>(
  cctpTransfer: T
): T {
  cctpTransfer.messageSent.amount = convertStringToUsdcBigNumber(
    cctpTransfer.messageSent.amount
  )
  return cctpTransfer
}

async function fetchCCTP({
  walletAddress,
  l1ChainId,
  pageNumber,
  pageSize,
  type,
  sourceChainTxHash
}: FetchParams & { type: 'deposits' | 'withdrawals' }): Promise<
  Response['data']
> {
  const urlParams = new URLSearchParams(
    sanitizeQueryParams({
      walletAddress,
      l1ChainId,
      pageNumber,
      pageSize,
      sourceChainTxHash
    })
  )

  if (pageSize === 0) return { pending: [], completed: [] } // don't query subgraph if nothing requested

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
    pending: pending.map(transfer => mapCCTPTransfer(transfer)),
    completed: completed.map(transfer => mapCCTPTransfer(transfer))
  }
}

type FetchCctpResponse = Response['data']
export async function fetchCCTPDeposits(
  params: FetchParams
): Promise<FetchCctpResponse> {
  return fetchCCTP({ ...params, type: 'deposits' })
}

export async function fetchCCTPWithdrawals(
  params: FetchParams
): Promise<FetchCctpResponse> {
  return fetchCCTP({ ...params, type: 'withdrawals' })
}

export async function fetchCompletedCCTPTransferBySourceChainTxHash(
  params: FetchParams
): Promise<CompletedCCTPTransfer | undefined> {
  const depositResult = await fetchCCTP({ ...params, type: 'deposits' })
  if (depositResult.pending.length || depositResult.completed.length) {
    return depositResult.completed[0]
  }
  const withdrawalResult = await fetchCCTP({ ...params, type: 'withdrawals' })
  return withdrawalResult.completed[0]
}
