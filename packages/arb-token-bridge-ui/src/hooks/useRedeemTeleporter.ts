import { useCallback, useState } from 'react'
import { Signer } from 'ethers'
import { L1ToL2MessageStatus, L1ToL2MessageWriter } from '@arbitrum/sdk'
import { useSigner } from 'wagmi'
import dayjs from 'dayjs'
import { TransactionReceipt } from '@ethersproject/providers'
import { DepositStatus, MergedTransaction } from '../state/app/state'
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
import { L2ToL3MessageData } from './useTransactions'
import { getProviderForChainId } from '../token-bridge-sdk/utils'
import { fetchTeleporterDepositStatusData } from '../util/deposits/helpers'
import { UseRedeemRetryableResult } from './useRedeemRetryable'
import { getUpdatedTeleportTransfer } from '../components/TransactionHistory/helpers'
import { getDepositStatus } from '../state/app/utils'
import { isTeleport } from '../token-bridge-sdk/teleport'

// common handling for redeeming all 3 retryables for teleporter
const redeemRetryable = async (retryable: L1ToL2MessageWriter) => {
  const redeemTx = await retryable.redeem({ gasLimit: 40_000_000 }) // after a few trials, this gas limit seems to be working fine
  await redeemTx.wait()

  const status = await retryable.status()
  const isSuccess = status === L1ToL2MessageStatus.REDEEMED

  if (!isSuccess) {
    console.error('Redemption failed; status is not REDEEMED', redeemTx)
    throw new Error(
      'Redemption failed; status is not REDEEMED. Please try again later.'
    )
  }

  const redeemReceipt = (await retryable.getSuccessfulRedeem()) as {
    status: L1ToL2MessageStatus.REDEEMED
    l2TxReceipt: TransactionReceipt
  }

  return redeemReceipt
}

// this will try to redeem - 1. L1L2Retryable 2. L2ForwarderRetryable
const redeemTeleporterFirstLeg = async ({
  tx,
  signer,
  txUpdateCallback
}: {
  tx: MergedTransaction
  signer: Signer
  txUpdateCallback?: (tx: MergedTransaction) => void
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
    teleportTransfer = await getUpdatedTeleporterTxAfterRedemption(tx)
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
    const updatedTeleportTransfer = await getUpdatedTeleporterTxAfterRedemption(
      teleportTransfer
    )
    await txUpdateCallback?.(updatedTeleportTransfer)
  }
}

// this will try to redeem - L2L3Retryable
const redeemTeleporterSecondLeg = async ({
  tx,
  signer,
  txUpdateCallback
}: {
  tx: MergedTransaction
  signer: Signer
  txUpdateCallback?: (tx: MergedTransaction) => void
}) => {
  // check if we require a redemption for the l2l3 retryable
  if (
    secondRetryableLegForTeleportRequiresRedeem(tx) &&
    tx.l1ToL2MsgData?.l2TxID &&
    tx.l2ToL3MsgData
  ) {
    const l2L3Retryable = await getRetryableTicket({
      parentChainTxHash: tx.l1ToL2MsgData.l2TxID,
      retryableCreationId: tx.l2ToL3MsgData?.retryableCreationTxID,
      parentChainProvider: getProviderForChainId(tx.l2ToL3MsgData.l2ChainId),
      childChainSigner: signer
    })

    // redeem retryable
    const redemptionReceipt = await redeemRetryable(l2L3Retryable)

    // update the teleport tx in the UI
    const l2ToL3MsgData: L2ToL3MessageData = {
      ...tx.l2ToL3MsgData,
      l3TxID: redemptionReceipt.l2TxReceipt.transactionHash,
      status: L1ToL2MessageStatus.REDEEMED,
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

const getUpdatedTeleporterTxAfterRedemption = async (tx: MergedTransaction) => {
  const { l1ToL2MsgData, l2ToL3MsgData } =
    await fetchTeleporterDepositStatusData(tx)

  const teleportTransfer = {
    ...tx,
    l1ToL2MsgData,
    l2ToL3MsgData
  }

  return {
    ...teleportTransfer,
    depositStatus: getDepositStatus(teleportTransfer)
  }
}

export function useRedeemTeleporter(
  tx: MergedTransaction,
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

    if (!isTeleport(tx)) {
      throw new Error(
        'The transaction being redeemed is not a LayerLeap transaction.'
      )
    }

    try {
      setIsRedeeming(true)

      if (!signer) {
        throw 'Signer is undefined'
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
      trackEvent('Redeem Retryable', { network: redeemerNetworkName })
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
