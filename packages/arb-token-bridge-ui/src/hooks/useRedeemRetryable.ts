import { useCallback, useState } from 'react'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'
import { useSigner } from 'wagmi'
import dayjs from 'dayjs'
import { TransactionReceipt } from '@ethersproject/providers'

import { DepositStatus, MergedTransaction } from '../state/app/state'
import { getRetryableTicket } from '../util/RetryableUtils'
import { trackEvent } from '../util/AnalyticsUtils'
import { getNetworkName } from '../util/networks'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { errorToast } from '../components/common/atoms/Toast'
import { getProviderForChainId } from './useNetworks'
import { useTransactionHistory } from './useTransactionHistory'
import { Address } from '../util/AddressUtils'

export type UseRedeemRetryableResult = {
  redeem: () => Promise<void>
  isRedeeming: boolean
}

export function useRedeemRetryable(
  tx: MergedTransaction,
  address: Address | undefined
): UseRedeemRetryableResult {
  const { data: signer } = useSigner({ chainId: tx.destinationChainId })
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
        l1TxHash: tx.txId,
        retryableCreationId: tx.l1ToL2MsgData?.retryableCreationTxID,
        l1Provider: getProviderForChainId(tx.parentChainId),
        l2Signer: signer
      })

      const reedemTx = await retryableTicket.redeem()
      await reedemTx.wait()

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
