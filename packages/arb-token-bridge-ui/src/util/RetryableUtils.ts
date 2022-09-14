import { L1TransactionReceipt, IL1ToL2MessageWriter } from '@arbitrum/sdk'
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
  date: number
  daysTillExpiry: number
  isValid: boolean
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
  let daysTillExpiry: number = 0
  let isValid = false // daysTillExpiry still loading...
  let expiryTimestamp = 0

  try {
    const depositTxReceipt = await l1Provider.getTransactionReceipt(l1TxHash)
    const l1TxReceipt = new L1TransactionReceipt(depositTxReceipt)
    const l1ToL2Msg = await l1TxReceipt.getL1ToL2Message(l2Provider)

    const now = dayjs()
    const expiryDate = await l1ToL2Msg.getTimeout()

    const expiryTimestamp = +expiryDate.toString() * 1000

    daysTillExpiry = dayjs(expiryTimestamp).diff(now, 'days')

    // show days till expiry only if retryable is not expired
    if (daysTillExpiry >= 0) isValid = true
  } catch {
    isValid = false
  }

  return {
    date: expiryTimestamp,
    daysTillExpiry,
    isValid
  }
}
