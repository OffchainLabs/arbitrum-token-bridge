import { useCallback, useState } from 'react'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'
import { useSigner } from 'wagmi'
import dayjs from 'dayjs'
import { TransactionReceipt } from '@ethersproject/providers'
import { DepositStatus, MergedTransaction } from '../state/app/state'
import {
  getChainIdForRedeemingRetryable,
  getRetryableTicket,
  getRetryableToRedeem
} from '../util/RetryableUtils'
import { trackEvent } from '../util/AnalyticsUtils'
import { getNetworkName } from '../util/networks'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { errorToast } from '../components/common/atoms/Toast'
import { useTransactionHistory } from './useTransactionHistory'
import { Address } from '../util/AddressUtils'
import { L1ToL2MessageData, L2ToL3MessageData } from './useTransactions'

export type UseRedeemRetryableResult = {
  redeem: () => Promise<void>
  isRedeeming: boolean
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
    try {
      setIsRedeeming(true)

      if (!signer) {
        throw 'Signer is undefined'
      }

      const {
        isFirstRetryableBeingRedeemed,
        parentChainTxHash,
        parentChainProvider,
        retryableCreationId
      } = getRetryableToRedeem(tx)

      const retryableTicket = await getRetryableTicket({
        parentChainTxHash,
        retryableCreationId,
        parentChainProvider,
        childChainSigner: signer
      })

      const reedemTx = await retryableTicket.redeem({ gasLimit: 40_000_000 }) // after a few trials, this gas limit seems to be working fine
      await reedemTx.wait()

      const status = await retryableTicket.status()
      const isSuccess = status === L1ToL2MessageStatus.REDEEMED

      if (!isSuccess) {
        console.error('Redemption failed; status is not REDEEMED', reedemTx)
        throw new Error(
          'Redemption failed; status is not REDEEMED. Please try again later.'
        )
      }

      const redeemReceipt = (await retryableTicket.getSuccessfulRedeem()) as {
        status: L1ToL2MessageStatus.REDEEMED
        l2TxReceipt: TransactionReceipt
      }

      if (isFirstRetryableBeingRedeemed) {
        // if this was the first retryable that was redeemed, update the first retryable with success and l2TxID
        // + update the upcoming retryable with a pending status, so that it's details are fetched
        await updatePendingTransaction({
          ...tx,
          l1ToL2MsgData: {
            ...tx.l1ToL2MsgData,
            l2TxID: redeemReceipt.l2TxReceipt.transactionHash,
            status,
            retryableCreationTxID: retryableTicket.retryableCreationId,
            fetchingUpdate: false
          } as L1ToL2MessageData,
          l2ToL3MsgData: {
            ...tx.l2ToL3MsgData,
            status: L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2 // 2nd retryable needs to be manually redeemed
          } as L2ToL3MessageData,
          depositStatus: DepositStatus.L2_PENDING
        })
      } else {
        // if this was the second retryable that was redeemed, full success
        await updatePendingTransaction({
          ...tx,
          l2ToL3MsgData: {
            ...tx.l2ToL3MsgData,
            l3TxID: redeemReceipt.l2TxReceipt.transactionHash,
            status,
            retryableCreationTxID: retryableTicket.retryableCreationId
          } as L2ToL3MessageData,
          depositStatus: DepositStatus.L2_SUCCESS,
          resolvedAt: dayjs().valueOf()
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
