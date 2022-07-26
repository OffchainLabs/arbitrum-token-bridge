import { useState } from 'react'
import { IL1ToL2MessageWriter, L1ToL2MessageStatus } from '@arbitrum/sdk'

import { useAppState } from '../state'
import { MergedTransaction } from '..//state/app/state'
import { getRetryableTicket } from '../util/RetryableUtils'
import { useNetworksAndSigners } from './useNetworksAndSigners'

export type UseRedeemRetryableResult = {
  redeem: (tx: MergedTransaction) => void
  isRedeeming: boolean
}

export function useRedeemRetryable(): UseRedeemRetryableResult {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const {
    l1: { signer: l1Signer },
    l2: { signer: l2Signer }
  } = useNetworksAndSigners()

  const [isRedeeming, setIsRedeeming] = useState(false)

  async function redeem(tx: MergedTransaction) {
    if (isRedeeming) {
      return
    }

    if (typeof l1Signer === 'undefined' || typeof l2Signer === 'undefined') {
      return
    }

    let retryableTicket: IL1ToL2MessageWriter

    try {
      setIsRedeeming(true)

      retryableTicket = await getRetryableTicket({
        l1TxHash: tx.txId,
        retryableCreationId: tx.l1ToL2MsgData?.retryableCreationTxID,
        l1Provider: l1Signer.provider,
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
