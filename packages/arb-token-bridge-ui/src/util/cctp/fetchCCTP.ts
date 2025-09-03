import { ChainId } from '../../types/ChainId'
import { getAPIBaseUrl, sanitizeQueryParams } from '..'
import {
  CompletedCCTPTransfer,
  PendingCCTPTransfer,
  Response
} from '../../app/api/cctp/[type]'
import { utils } from 'ethers'

export type FetchParams = {
  walletAddress: string
  l1ChainId: ChainId
  pageNumber: number
  pageSize: number
  connectedToEthereum: boolean
  isSmartContractWallet: boolean
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

function sanitizeSmartContractWalletCctpTransfers<
  T extends PendingCCTPTransfer | CompletedCCTPTransfer
>({
  type,
  walletAddress,
  transfers,
  connectedToEthereum
}: {
  type: 'deposits' | 'withdrawals'
  walletAddress: string
  transfers: T[]
  connectedToEthereum: boolean
}): T[] {
  const walletAddressLowercased = walletAddress.toLowerCase()

  return transfers.filter(tx => {
    const { sender, recipient } = tx.messageSent
    const senderLowercased = sender.toLowerCase()
    const recipientLowercased = recipient.toLowerCase()

    if (type === 'deposits') {
      if (connectedToEthereum) {
        return senderLowercased === walletAddressLowercased
      }
      return recipientLowercased === walletAddressLowercased
    }

    if (connectedToEthereum) {
      return recipientLowercased === walletAddressLowercased
    }
    return senderLowercased === walletAddressLowercased
  }) satisfies T[]
}

async function fetchCCTP({
  walletAddress,
  l1ChainId,
  pageNumber,
  pageSize,
  type,
  connectedToEthereum,
  isSmartContractWallet
}: FetchParams & { type: 'deposits' | 'withdrawals' }): Promise<
  Response['data']
> {
  const urlParams = new URLSearchParams(
    sanitizeQueryParams({
      walletAddress,
      l1ChainId,
      pageNumber,
      pageSize,
      connectedToEthereum,
      isSmartContractWallet
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

  const sanitizedPendingTransfers = isSmartContractWallet
    ? sanitizeSmartContractWalletCctpTransfers<PendingCCTPTransfer>({
        type,
        walletAddress,
        transfers: pending,
        connectedToEthereum
      })
    : pending

  const sanitizedCompletedTransfers = isSmartContractWallet
    ? sanitizeSmartContractWalletCctpTransfers<CompletedCCTPTransfer>({
        type,
        walletAddress,
        transfers: completed,
        connectedToEthereum
      })
    : completed

  return {
    pending: sanitizedPendingTransfers.map(transfer =>
      mapCCTPTransfer(transfer)
    ),
    completed: sanitizedCompletedTransfers.map(transfer =>
      mapCCTPTransfer(transfer)
    )
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
