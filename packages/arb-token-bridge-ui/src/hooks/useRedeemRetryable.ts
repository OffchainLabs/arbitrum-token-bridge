import { useCallback, useState } from 'react'
import { ParentToChildMessageStatus } from '@arbitrum/sdk'
import dayjs from 'dayjs'

import { DepositStatus, MergedTransaction } from '../state/app/state'
import { getRetryableTicket } from '../util/RetryableUtils'
import { trackEvent } from '../util/AnalyticsUtils'
import { getNetworkName } from '../util/networks'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { errorToast } from '../components/common/atoms/Toast'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { useTransactionHistory } from './useTransactionHistory'
import { Address } from '../util/AddressUtils'
import { useEthersSigner } from '../util/wagmi/useEthersSigner'

export type UseRedeemRetryableResult = {
  redeem: () => Promise<void>
  isRedeeming: boolean
}

export function useRedeemRetryable(
  tx: MergedTransaction,
  address: Address | undefined
): UseRedeemRetryableResult {
  const signer = useEthersSigner({ chainId: tx.destinationChainId })
  const { updatePendingTransaction } = useTransactionHistory(address)

  const destinationNetworkName = getNetworkName(tx.destinationChainId)

  const [isRedeeming, setIsRedeeming] = useState(false)

  const redeem = useCallback(async () => {
    if (isRedeeming) {
      return
    }
    try {
      setIsRedeeming(true)

      if (!signer) {
        throw 'Signer is undefined'
      }

      const retryableTicket = await getRetryableTicket({
        parentChainTxHash: tx.txId,
        retryableCreationId: tx.parentToChildMsgData?.retryableCreationTxID,
        parentChainProvider: getProviderForChainId(tx.parentChainId),
        childChainSigner: signer
      })

      const redeemTx = await retryableTicket.redeem()
      await redeemTx.wait()

      const status = await retryableTicket.status()
      const isSuccess = status === ParentToChildMessageStatus.REDEEMED
      const successfulRedeem = await retryableTicket.getSuccessfulRedeem()

      if (successfulRedeem.status !== ParentToChildMessageStatus.REDEEMED) {
        throw new Error(
          `Unexpected status for retryable ticket (parent tx hash ${tx.txId}), expected ${ParentToChildMessageStatus.REDEEMED} but got ${successfulRedeem.status}`
        )
      }

      await updatePendingTransaction({
        ...tx,
        parentToChildMsgData: {
          childTxId: successfulRedeem.childTxReceipt.transactionHash,
          status,
          retryableCreationTxID: retryableTicket.retryableCreationId,
          fetchingUpdate: false
        },
        resolvedAt: isSuccess ? dayjs().valueOf() : null,
        depositStatus: isSuccess ? DepositStatus.L2_SUCCESS : tx.depositStatus
      })

      // track in analytics
      trackEvent('Redeem Retryable', { network: destinationNetworkName })
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
  }, [
    isRedeeming,
    destinationNetworkName,
    signer,
    tx,
    updatePendingTransaction
  ])

  return { redeem, isRedeeming }
}
