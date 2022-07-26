import { L1TransactionReceipt, IL1ToL2MessageWriter } from '@arbitrum/sdk'
import { Signer } from '@ethersproject/abstract-signer'
import { Provider } from '@ethersproject/abstract-provider'

type GetRetryableTicketParams = {
  l1TxHash: string
  retryableCreationId?: string
  l1Provider: Provider
  l2Signer: Signer
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
