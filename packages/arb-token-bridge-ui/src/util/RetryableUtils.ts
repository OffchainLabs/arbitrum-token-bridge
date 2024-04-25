import {
  L1TransactionReceipt,
  L1ToL2MessageWriter as IL1ToL2MessageWriter,
  L1ToL2MessageStatus
} from '@arbitrum/sdk'
import { Signer } from '@ethersproject/abstract-signer'
import { Provider } from '@ethersproject/abstract-provider'
import dayjs from 'dayjs'
import { JsonRpcProvider } from '@ethersproject/providers'
import { MergedTransaction } from '../state/app/state'
import { isTeleport } from '../token-bridge-sdk/teleport'

type GetRetryableTicketParams = {
  sourceChainTxHash: string
  retryableCreationId?: string
  sourceChainProvider: Provider
  destinationChainSigner: Signer
}

type GetRetryableTicketExpirationParams = {
  sourceChainTxHash: string
  sourceChainProvider: JsonRpcProvider
  destinationChainProvider: JsonRpcProvider
}

type RetryableTicketExpirationResponse = {
  isLoading: boolean
  isLoadingError: boolean
  expirationDate: number
  daysUntilExpired: number
  isExpired: boolean
}

export async function getRetryableTicket({
  sourceChainTxHash,
  retryableCreationId,
  sourceChainProvider,
  destinationChainSigner
}: GetRetryableTicketParams): Promise<IL1ToL2MessageWriter> {
  if (!retryableCreationId) {
    throw new Error("Error: Couldn't find retryable ticket creation id")
  }

  const sourceChainTxReceipt = new L1TransactionReceipt(
    await sourceChainProvider.getTransactionReceipt(sourceChainTxHash)
  )

  const retryableTicket = (
    await sourceChainTxReceipt.getL1ToL2Messages(destinationChainSigner)
  )
    // Find message with the matching id
    .find(m => m.retryableCreationId === retryableCreationId)

  if (typeof retryableTicket === 'undefined') {
    throw new Error("Error: Couldn't find retryable ticket")
  }

  return retryableTicket
}

export const getRetryableTicketExpiration = async ({
  sourceChainTxHash,
  sourceChainProvider,
  destinationChainProvider
}: GetRetryableTicketExpirationParams): Promise<RetryableTicketExpirationResponse> => {
  let isLoading = true,
    isLoadingError = false,
    isExpired = false

  let daysUntilExpired = 0
  let expirationDate = 0

  try {
    const depositTxReceipt = await sourceChainProvider.getTransactionReceipt(
      sourceChainTxHash
    )
    const sourceChainTxReceipt = new L1TransactionReceipt(depositTxReceipt)
    const [message] = await sourceChainTxReceipt.getL1ToL2Messages(
      destinationChainProvider
    )

    const now = dayjs()

    const expiryDateResponse = await message!.getTimeout()
    expirationDate = Number(expiryDateResponse.toString()) * 1000

    daysUntilExpired = dayjs(expirationDate).diff(now, 'days')

    if (daysUntilExpired >= 0) isExpired = false
  } catch (_) {
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

export const firstRetryableRequiresRedeem = (tx: MergedTransaction) => {
  return tx.l1ToL2MsgData?.status === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2
}

export const secondRetryableRequiresRedeem = (tx: MergedTransaction) => {
  return tx.l2ToL3MsgData?.status === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2
}

export const getChainIdForRedeemingRetryable = (tx: MergedTransaction) => {
  // which chain id needs to be connected to, to redeem the retryable ticket

  let chainIdForRedeemingRetryable

  if (isTeleport(tx)) {
    chainIdForRedeemingRetryable = firstRetryableRequiresRedeem(tx)
      ? tx.l2ToL3MsgData?.l2ChainId
      : tx.destinationChainId
  } else {
    chainIdForRedeemingRetryable = tx.destinationChainId
  }

  if (!chainIdForRedeemingRetryable) {
    throw Error(
      `Could not find destination chain id for redeeming retryable for ${tx.txId}`
    )
  }

  return chainIdForRedeemingRetryable
}
