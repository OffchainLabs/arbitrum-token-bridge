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
  parentChainTxHash: string
  retryableCreationId?: string
  parentChainProvider: Provider
  childChainSigner: Signer
}

type GetRetryableTicketExpirationParams = {
  parentChainTxHash: string
  parentChainProvider: JsonRpcProvider
  childChainProvider: JsonRpcProvider
}

type RetryableTicketExpirationResponse = {
  isLoading: boolean
  isLoadingError: boolean
  expirationDate: number
  daysUntilExpired: number
  isExpired: boolean
}

export async function getRetryableTicket({
  parentChainTxHash,
  retryableCreationId,
  parentChainProvider,
  childChainSigner
}: GetRetryableTicketParams): Promise<IL1ToL2MessageWriter> {
  if (!retryableCreationId) {
    throw new Error("Error: Couldn't find retryable ticket creation id")
  }

  const parentChainTxReceipt = new L1TransactionReceipt(
    await parentChainProvider.getTransactionReceipt(parentChainTxHash)
  )

  const retryableTicket = (
    await parentChainTxReceipt.getL1ToL2Messages(childChainSigner)
  )
    // Find message with the matching id
    .find(m => m.retryableCreationId === retryableCreationId)

  if (typeof retryableTicket === 'undefined') {
    throw new Error("Error: Couldn't find retryable ticket")
  }

  return retryableTicket
}

export const getRetryableTicketExpiration = async ({
  parentChainTxHash,
  parentChainProvider,
  childChainProvider
}: GetRetryableTicketExpirationParams): Promise<RetryableTicketExpirationResponse> => {
  let isLoading = true,
    isLoadingError = false,
    isExpired = false

  let daysUntilExpired = 0
  let expirationDate = 0

  try {
    const depositTxReceipt = await parentChainProvider.getTransactionReceipt(
      parentChainTxHash
    )
    const parentChainTxReceipt = new L1TransactionReceipt(depositTxReceipt)
    const [parentToChildMsg] = await parentChainTxReceipt.getL1ToL2Messages(
      childChainProvider
    )

    const now = dayjs()

    const expiryDateResponse = await parentToChildMsg!.getTimeout()
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

// utilities for teleporter transactions
export const l1L2RetryableRequiresRedeem = (tx: MergedTransaction) => {
  return tx.l1ToL2MsgData?.status === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2
}

export const l2ForwarderRetryableRequiresRedeem = (tx: MergedTransaction) => {
  return typeof tx.l2ToL3MsgData?.l2ForwarderRetryableTxID !== 'undefined'
}
export const l2L3RetryableRequiresRedeem = (tx: MergedTransaction) => {
  return (
    !l2ForwarderRetryableRequiresRedeem(tx) &&
    tx.l2ToL3MsgData?.status === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2
  )
}

export const firstRetryableLegRequiresRedeem = (tx: MergedTransaction) => {
  return (
    l1L2RetryableRequiresRedeem(tx) || l2ForwarderRetryableRequiresRedeem(tx)
  )
}

export const getChainIdForRedeemingRetryable = (tx: MergedTransaction) => {
  // which chain id needs to be connected to, to redeem the retryable ticket

  let chainIdForRedeemingRetryable

  if (isTeleport(tx)) {
    // unless it's the final retryable being redeemed, we need to connect to the l2 chain in teleport, else, destination chain
    chainIdForRedeemingRetryable = firstRetryableLegRequiresRedeem(tx)
      ? tx.l2ToL3MsgData?.l2ChainId
      : tx.childChainId
  } else {
    chainIdForRedeemingRetryable = tx.childChainId
  }

  if (!chainIdForRedeemingRetryable) {
    throw Error(
      `Could not find destination chain id for redeeming retryable for ${tx.txId}`
    )
  }

  return chainIdForRedeemingRetryable
}
