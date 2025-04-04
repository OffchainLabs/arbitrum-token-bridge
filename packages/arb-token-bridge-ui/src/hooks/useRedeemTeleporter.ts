import { useCallback, useState } from 'react'
import { Signer } from 'ethers'
import {
  ParentToChildMessageStatus,
  ParentToChildMessageWriter
} from '@arbitrum/sdk'
import { useSigner } from 'wagmi'
import dayjs from 'dayjs'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import {
  DepositStatus,
  MergedTransaction,
  TeleporterMergedTransaction
} from '../state/app/state'
import {
  firstRetryableLegRequiresRedeem,
  getChainIdForRedeemingRetryable,
  getRetryableTicket,
  l1L2RetryableRequiresRedeem,
  l2ForwarderRetryableRequiresRedeem,
  secondRetryableLegForTeleportRequiresRedeem
} from '../util/RetryableUtils'
import { trackEvent } from '../util/AnalyticsUtils'
import { getNetworkName } from '../util/networks'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { errorToast } from '../components/common/atoms/Toast'
import { useTransactionHistory } from './useTransactionHistory'
import { Address } from '../util/AddressUtils'
import { isTeleportTx, L2ToL3MessageData } from '../types/Transactions'
import { UseRedeemRetryableResult } from './useRedeemRetryable'
import { getUpdatedTeleportTransfer } from '../components/TransactionHistory/helpers'

// common handling for redeeming all 3 retryables for teleporter
const redeemRetryable = async (retryable: ParentToChildMessageWriter) => {
  const redeemTx = await retryable.redeem({ gasLimit: 40_000_000 }) // after a few trials, this gas limit seems to be working fine
  await redeemTx.wait()

  const status = await retryable.status()
  const isSuccess = status === ParentToChildMessageStatus.REDEEMED

  if (!isSuccess) {
    console.error('Redemption failed; status is not REDEEMED', redeemTx)
    throw new Error(
      'Redemption failed; status is not REDEEMED. Please try again later.'
    )
  }

  const successfulRedeem = await retryable.getSuccessfulRedeem()

  if (successfulRedeem.status !== ParentToChildMessageStatus.REDEEMED) {
    throw new Error(
      `Unexpected status for retryable ticket (creation id ${retryable.retryableCreationId}), expected ${ParentToChildMessageStatus.REDEEMED} but got ${successfulRedeem.status}`
    )
  }

  return successfulRedeem
}

// this will try to redeem - 1. L1L2Retryable 2. L2ForwarderRetryable
const redeemTeleporterFirstLeg = async ({
  tx,
  signer,
  txUpdateCallback
}: {
  tx: TeleporterMergedTransaction
  signer: Signer
  txUpdateCallback?: (tx: TeleporterMergedTransaction) => Promise<void>
}) => {
  let teleportTransfer = tx

  // check if we require a redemption for the first retryable
  if (l1L2RetryableRequiresRedeem(tx)) {
    // get retryable ticket
    const l1l2Retryable = await getRetryableTicket({
      parentChainTxHash: tx.txId,
      retryableCreationId: tx.l1ToL2MsgData?.retryableCreationTxID,
      parentChainProvider: getProviderForChainId(tx.parentChainId),
      childChainSigner: signer
    })

    // redeem retryable
    await redeemRetryable(l1l2Retryable)

    // update the teleport tx in the UI
    teleportTransfer = await getUpdatedTeleportTransfer(tx)
    await txUpdateCallback?.(teleportTransfer)
  }

  // check if we require a redemption for the second retryable
  if (l2ForwarderRetryableRequiresRedeem(teleportTransfer)) {
    // get retryable ticket
    const l2ForwarderRetryable = await getRetryableTicket({
      parentChainTxHash: tx.txId,
      retryableCreationId:
        teleportTransfer?.l2ToL3MsgData?.l2ForwarderRetryableTxID,
      parentChainProvider: getProviderForChainId(tx.parentChainId),
      childChainSigner: signer
    })

    // redeem retryable
    await redeemRetryable(l2ForwarderRetryable)

    // update the teleport tx in the UI
    const updatedTeleportTransfer =
      await getUpdatedTeleportTransfer(teleportTransfer)
    await txUpdateCallback?.(updatedTeleportTransfer)
  }
}

// this will try to redeem - L2L3Retryable
const redeemTeleporterSecondLeg = async ({
  tx,
  signer,
  txUpdateCallback
}: {
  tx: TeleporterMergedTransaction
  signer: Signer
  txUpdateCallback?: (tx: TeleporterMergedTransaction) => Promise<void>
}) => {
  // check if we require a redemption for the l2l3 retryable
  if (
    secondRetryableLegForTeleportRequiresRedeem(tx) &&
    tx.l1ToL2MsgData?.childTxId &&
    tx.l2ToL3MsgData
  ) {
    const l2L3Retryable = await getRetryableTicket({
      parentChainTxHash: tx.l1ToL2MsgData.childTxId,
      retryableCreationId: tx.l2ToL3MsgData?.retryableCreationTxID,
      parentChainProvider: getProviderForChainId(tx.l2ToL3MsgData.l2ChainId),
      childChainSigner: signer
    })

    // redeem retryable
    const redemptionReceipt = await redeemRetryable(l2L3Retryable)

    // update the teleport tx in the UI
    const l2ToL3MsgData: L2ToL3MessageData = {
      ...tx.l2ToL3MsgData,
      l3TxID: redemptionReceipt.childTxReceipt.transactionHash,
      status: ParentToChildMessageStatus.REDEEMED,
      retryableCreationTxID: l2L3Retryable.retryableCreationId
    }
    const updatedTeleporterTx = await getUpdatedTeleportTransfer({
      ...tx,
      l2ToL3MsgData,
      depositStatus: DepositStatus.L2_SUCCESS,
      resolvedAt: dayjs().valueOf()
    })
    await txUpdateCallback?.(updatedTeleporterTx)
  }
}

export function useRedeemTeleporter(
  tx: TeleporterMergedTransaction | MergedTransaction,
  address: Address | undefined
): UseRedeemRetryableResult {
  const chainIdForRedeemingRetryable = getChainIdForRedeemingRetryable(tx)

  const { data: signer } = useSigner({
    chainId: chainIdForRedeemingRetryable
  })
  const { updatePendingTransaction } = useTransactionHistory(address)

  const redeemerNetworkName = getNetworkName(chainIdForRedeemingRetryable)

  const [isRedeeming, setIsRedeeming] = useState(false)

  const redeem = useCallback(async () => {
    if (isRedeeming) {
      return
    }

    if (!isTeleportTx(tx)) {
      throw new Error(
        'The transaction being redeemed is not a LayerLeap transaction.'
      )
    }

    try {
      setIsRedeeming(true)

      if (!signer) {
        throw 'Signer is undefined'
      }

      if (
        !firstRetryableLegRequiresRedeem(tx) &&
        !secondRetryableLegForTeleportRequiresRedeem(tx)
      ) {
        // fail-safe: if there is no retryable to redeem, we should break the flow here
        throw 'Transaction does not require redemption.'
      }

      if (firstRetryableLegRequiresRedeem(tx)) {
        await redeemTeleporterFirstLeg({
          tx,
          signer,
          txUpdateCallback: updatePendingTransaction
        })
      } else if (secondRetryableLegForTeleportRequiresRedeem(tx)) {
        await redeemTeleporterSecondLeg({
          tx,
          signer,
          txUpdateCallback: updatePendingTransaction
        })
      }

      // track in analytics
      trackEvent('Redeem Teleport Retryable', { network: redeemerNetworkName })
    } catch (error: any) {
      if (isUserRejectedError(error)) {
        return
      }
      return errorToast(
        `There was an error, here is more information: ${error.message}`
      )
    } finally {
      setIsRedeeming(false)
    }
  }, [isRedeeming, redeemerNetworkName, signer, tx, updatePendingTransaction])

  return { redeem, isRedeeming }
}
