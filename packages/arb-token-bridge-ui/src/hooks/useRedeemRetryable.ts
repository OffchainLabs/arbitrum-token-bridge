import { useState } from 'react'
import {
  L1ToL2MessageWriter as IL1ToL2MessageWriter,
  L1ToL2MessageStatus
} from '@arbitrum/sdk'
import { useSigner } from 'wagmi'

import { MergedTransaction } from '../state/app/state'
import { getRetryableTicket } from '../util/RetryableUtils'
import { shouldTrackAnalytics, trackEvent } from '../util/AnalyticsUtils'
import { getNetworkName } from '../util/networks'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { errorToast } from '../components/common/atoms/Toast'
import { AssetType } from './arbTokenBridge.types'
import { useNetworks } from './useNetworks'
import { useNetworksRelationship } from './useNetworksRelationship'
import useTransactions from './useTransactions'

export type UseRedeemRetryableResult = {
  redeem: (tx: MergedTransaction) => void
  isRedeeming: boolean
}

export function useRedeemRetryable(): UseRedeemRetryableResult {
  const [, { fetchAndUpdateL1ToL2MsgStatus }] = useTransactions()
  const [networks] = useNetworks()
  const { childChain, parentChainProvider } = useNetworksRelationship(networks)
  const { data: signer } = useSigner()
  const l2NetworkName = getNetworkName(childChain.id)

  const [isRedeeming, setIsRedeeming] = useState(false)

  async function redeem(tx: MergedTransaction) {
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
        l1Provider: parentChainProvider,
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
      setIsRedeeming(false)

      // track in analytics
      if (shouldTrackAnalytics(l2NetworkName)) {
        trackEvent('Redeem Retryable', { network: l2NetworkName })
      }
    }

    // update in store
    fetchAndUpdateL1ToL2MsgStatus(
      tx.txId,
      retryableTicket,
      tx.assetType === AssetType.ETH,
      L1ToL2MessageStatus.REDEEMED
    )
  }

  return { redeem, isRedeeming }
}
