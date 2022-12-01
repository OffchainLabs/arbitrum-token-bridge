import {
  L1TransactionReceipt,
  L1ToL2MessageWriter as IL1ToL2MessageWriter
} from '@arbitrum/sdk'
import { Signer } from '@ethersproject/abstract-signer'
import { Provider } from '@ethersproject/abstract-provider'
import dayjs from 'dayjs'
import { JsonRpcProvider } from '@ethersproject/providers'

type GetRetryableTicketParams = {
  l1TxHash: string
  retryableCreationId?: string
  l1Provider: Provider
  l2Signer: Signer
}

type GetRetryableTicketExpirationParams = {
  l1TxHash: string
  l1Provider: JsonRpcProvider
  l2Provider: JsonRpcProvider
}

type RetryableTicketExpirationResponse = {
  isLoading: boolean
  isLoadingError: boolean
  expirationDate: number
  daysUntilExpired: number
  isExpired: boolean
}

export async function getRetryableTicket({
  l1TxHash,
  retryableCreationId,
  l1Provider,
  l2Signer
}: GetRetryableTicketParams): Promise<IL1ToL2MessageWriter> {
  if (!retryableCreationId) {
    throw new Error("Error: Couldn't find retryable ticket creation id")
  }

  const l1TxReceipt = new L1TransactionReceipt(
    await l1Provider.getTransactionReceipt(l1TxHash)
  )

  const retryableTicket = (await l1TxReceipt.getL1ToL2Messages(l2Signer))
    // Find message with the matching id
    .find(m => m.retryableCreationId === retryableCreationId)

  if (typeof retryableTicket === 'undefined') {
    throw new Error("Error: Couldn't find retryable ticket")
  }

  return retryableTicket
}

export const getRetryableTicketExpiration = async ({
  l1TxHash,
  l1Provider,
  l2Provider
}: GetRetryableTicketExpirationParams): Promise<RetryableTicketExpirationResponse> => {
  let isLoading = true,
    isLoadingError = false,
    isExpired = false

  let daysUntilExpired = 0
  let expirationDate = 0

  try {
    const depositTxReceipt = await l1Provider.getTransactionReceipt(l1TxHash)
    const l1TxReceipt = new L1TransactionReceipt(depositTxReceipt)
    const [l1ToL2Msg] = await l1TxReceipt.getL1ToL2Messages(l2Provider)

    const now = dayjs()

    const expiryDateResponse = await l1ToL2Msg!.getTimeout()
    expirationDate = Number(expiryDateResponse.toString()) * 1000

    daysUntilExpired = dayjs(expirationDate).diff(now, 'days')

    if (daysUntilExpired >= 0) isExpired = false
  } catch {
    isLoadingError = true
  }

  isLoading = false

  return {
    // promise loading state
    isLoading,
    isLoadingError,

    // expiration state
    expirationDate,
    daysUntilExpired,
    isExpired
  }
}
