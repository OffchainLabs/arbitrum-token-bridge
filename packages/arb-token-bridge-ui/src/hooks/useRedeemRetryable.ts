import { useState } from 'react'
import {
  L1ToL2MessageWriter as IL1ToL2MessageWriter,
  L1ToL2MessageStatus
} from '@arbitrum/sdk'

import { useAppState } from '../state'
import { MergedTransaction } from '../state/app/state'
import { getRetryableTicket } from '../util/RetryableUtils'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import { isFathomNetworkName, trackEvent } from '../util/AnalyticsUtils'
import { getNetworkName } from '../util/networks'

export type UseRedeemRetryableResult = {
  redeem: (tx: MergedTransaction) => void
  isRedeeming: boolean
}

export function useRedeemRetryable(): UseRedeemRetryableResult {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const {
    l1: { provider: l1Provider, network: l1Network },
    l2: { signer: l2Signer }
  } = useNetworksAndSigners()
  const l1NetworkName = getNetworkName(l1Network.chainID)

  const [isRedeeming, setIsRedeeming] = useState(false)

  async function redeem(tx: MergedTransaction) {
    if (isRedeeming) {
      return
    }

    let retryableTicket: IL1ToL2MessageWriter

    try {
      setIsRedeeming(true)

      retryableTicket = await getRetryableTicket({
        l1TxHash: tx.txId,
        retryableCreationId: tx.l1ToL2MsgData?.retryableCreationTxID,
        l1Provider,
        l2Signer
      })
    } catch (error: any) {
      setIsRedeeming(false)
      return alert(error.message)
    }

    try {
      const tx = await retryableTicket.redeem()
      await tx.wait()
    } catch (error: any) {
      if (error.code !== 4001) {
        alert(error.message)
      }

      return
    } finally {
      setIsRedeeming(false)

      // track in analytics
      if (isFathomNetworkName(l1NetworkName)) {
        trackEvent(`Redeeming Retryable on ${l1NetworkName}`)
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
