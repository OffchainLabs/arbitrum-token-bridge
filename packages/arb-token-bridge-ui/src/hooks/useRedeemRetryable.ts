import { useState } from 'react'
import {
  L1ToL2MessageWriter as IL1ToL2MessageWriter,
  L1ToL2MessageStatus
} from '@arbitrum/sdk'
import { useAccount, useSigner } from 'wagmi'
import { TransactionReceipt } from '@ethersproject/providers'
import dayjs from 'dayjs'

import { DepositStatus, MergedTransaction } from '../state/app/state'
import { getRetryableTicket } from '../util/RetryableUtils'
import { trackEvent } from '../util/AnalyticsUtils'
import { getNetworkName } from '../util/networks'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { errorToast } from '../components/common/atoms/Toast'
import { useNetworks } from './useNetworks'
import { useNetworksRelationship } from './useNetworksRelationship'
import { useTransactionHistory } from './useTransactionHistory'

export type UseRedeemRetryableResult = {
  redeem: (tx: MergedTransaction) => void
  isRedeeming: boolean
}

export function useRedeemRetryable(): UseRedeemRetryableResult {
  const [networks] = useNetworks()
  const { address } = useAccount()
  const { childChain, parentChainProvider } = useNetworksRelationship(networks)
  const { updatePendingTransaction } = useTransactionHistory(address)
  const { data: signer } = useSigner()
  const l2NetworkName = getNetworkName(childChain.id)

  const [isRedeeming, setIsRedeeming] = useState(false)

  async function redeem(tx: MergedTransaction) {
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
        l1Provider: parentChainProvider,
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
    } catch (error: any) {
      if (isUserRejectedError(error)) {
        return
      }

      return errorToast(
        `There was an error, here is more information: ${error.message}`
      )
    } finally {
      setIsRedeeming(false)

      // track in analytics
      trackEvent('Redeem Retryable', { network: l2NetworkName })
    }
  }

  return { redeem, isRedeeming }
}
