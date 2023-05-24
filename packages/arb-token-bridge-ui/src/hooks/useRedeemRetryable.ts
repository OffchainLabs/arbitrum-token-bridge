import { useState } from 'react'
import {
  L1ToL2MessageWriter as IL1ToL2MessageWriter,
  L1ToL2MessageStatus
} from '@arbitrum/sdk'
import { useSigner } from 'wagmi'

import { useAppState } from '../state'
import { MergedTransaction } from '../state/app/state'
import { getRetryableTicket } from '../util/RetryableUtils'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import { shouldTrackAnalytics, trackEvent } from '../util/AnalyticsUtils'
import { getNetworkName } from '../util/networks'
import { isUserRejectedError } from '../util/isUserRejectedError'

export type UseRedeemRetryableResult = {
  redeem: (tx: MergedTransaction) => void
  isRedeeming: boolean
}

export function useRedeemRetryable(): UseRedeemRetryableResult {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const {
    l1: { provider: l1Provider },
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const { data: signer } = useSigner()
  const l2NetworkName = getNetworkName(l2Network.id)

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
        l1Provider,
        l2Signer: signer
      })
    } catch (error: any) {
      setIsRedeeming(false)
      return alert(
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

      return alert(
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
    arbTokenBridge.transactions.fetchAndUpdateL1ToL2MsgStatus(
      tx.txId,
      retryableTicket,
      tx.asset === 'eth',
      L1ToL2MessageStatus.REDEEMED
    )
  }

  return { redeem, isRedeeming }
}
