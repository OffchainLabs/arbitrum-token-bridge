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
import { getProviderForChainId } from '@/token-bridge-sdk/utils'

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
    const [message] = await parentChainTxReceipt.getL1ToL2Messages(
      childChainProvider
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

// utilities for teleporter transactions
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

// given a tx, find the retryable that needs redeeming and return the necessary info
export const getRetryableToRedeem = (tx: MergedTransaction) => {
  // 1. first check which leg of the tx needs redeeming - l1toL2 or l2tol3
  // 2. then, ensure that the user is connected to the proper providers and signers
  // 3. then, we can call the same redeem logic we have on any of the Retryables and update the tx accordingly

  const isFirstRetryableBeingRedeemed = firstRetryableRequiresRedeem(tx)

  let parentChainTxHash, retryableCreationId, parentChainProvider

  if (isFirstRetryableBeingRedeemed) {
    // first retryable info
    parentChainTxHash = tx.txId
    retryableCreationId = tx.l1ToL2MsgData?.retryableCreationTxID
    parentChainProvider = getProviderForChainId(tx.parentChainId)
  } else if (tx.l2ToL3MsgData) {
    // second retryable info
    parentChainTxHash = tx.l1ToL2MsgData?.l2TxID
    retryableCreationId = tx.l2ToL3MsgData.retryableCreationTxID
    parentChainProvider = getProviderForChainId(tx.l2ToL3MsgData.l2ChainId)
  }

  if (!parentChainTxHash || !parentChainProvider) {
    throw 'Could not find redemption details'
  }

  return {
    isFirstRetryableBeingRedeemed,
    parentChainTxHash,
    parentChainProvider,
    retryableCreationId
  }
}
