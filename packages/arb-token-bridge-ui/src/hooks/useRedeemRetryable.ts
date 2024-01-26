import { useCallback, useState } from 'react'
import {
  L1ToL2MessageWriter as IL1ToL2MessageWriter,
  L1ToL2MessageStatus
} from '@arbitrum/sdk'
import { useSigner } from 'wagmi'
import dayjs from 'dayjs'
import { TransactionReceipt } from '@ethersproject/providers'

import { DepositStatus, MergedTransaction } from '../state/app/state'
import { getRetryableTicket } from '../util/RetryableUtils'
import { shouldTrackAnalytics, trackEvent } from '../util/AnalyticsUtils'
import { getNetworkName } from '../util/networks'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { errorToast } from '../components/common/atoms/Toast'
import { getProviderForChainId } from './useNetworks'
import { useTransactionHistory } from './useTransactionHistory'

export type UseRedeemRetryableResult = {
  redeem: () => void
  isRedeeming: boolean
}

export function useRedeemRetryable(
  tx: MergedTransaction,
  address: `0x${string}` | undefined
): UseRedeemRetryableResult {
  const { data: signer } = useSigner({ chainId: tx.childChainId })
  const { updatePendingTransaction } = useTransactionHistory(address)

  const l2NetworkName = getNetworkName(tx.childChainId)

  const [isRedeeming, setIsRedeeming] = useState(false)

  const redeem = useCallback(async () => {
    if (isRedeeming) {
      return
    }

    let retryableTicket: IL1ToL2MessageWriter

    try {
      setIsRedeeming(true)

      if (!signer) {
        throw 'Signer is undefined'
      }

      retryableTicket = await getRetryableTicket({
        l1TxHash: tx.txId,
        retryableCreationId: tx.l1ToL2MsgData?.retryableCreationTxID,
        l1Provider: getProviderForChainId(tx.parentChainId),
        l2Signer: signer
      })
    } catch (error: any) {
      setIsRedeeming(false)
      return errorToast(
        `There was an error, here is more information: ${error.message}`
      )
    }

    try {
      const tx = await retryableTicket.redeem()
      await tx.wait()
    } catch (error: any) {
      if (isUserRejectedError(error)) {
        return
      }

      return errorToast(
        `There was an error, here is more information: ${error.message}`
      )
    } finally {
      const status = await retryableTicket.status()
      const isSuccess = status === L1ToL2MessageStatus.REDEEMED

      const redeemReceipt = (await retryableTicket.getSuccessfulRedeem()) as {
        status: L1ToL2MessageStatus.REDEEMED
        l2TxReceipt: TransactionReceipt
      }

      updatePendingTransaction({
        ...tx,
        l1ToL2MsgData: {
          l2TxID: redeemReceipt.l2TxReceipt.transactionHash,
          status,
          retryableCreationTxID: retryableTicket.retryableCreationId,
          fetchingUpdate: false
        },
        resolvedAt: isSuccess ? dayjs().valueOf() : null,
        depositStatus: isSuccess ? DepositStatus.L2_SUCCESS : tx.depositStatus
      })

      setIsRedeeming(false)

      // track in analytics
      if (shouldTrackAnalytics(l2NetworkName)) {
        trackEvent('Redeem Retryable', { network: l2NetworkName })
      }
    }
  }, [isRedeeming, l2NetworkName, signer, tx, updatePendingTransaction])

  return { redeem, isRedeeming }
}
