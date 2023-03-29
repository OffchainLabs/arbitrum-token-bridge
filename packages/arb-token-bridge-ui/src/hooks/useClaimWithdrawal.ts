import { useState } from 'react'
import * as Sentry from '@sentry/react'
import { useAppState } from '../state'
import { MergedTransaction } from '../state/app/state'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { useNetworksAndSigners } from './useNetworksAndSigners'

export type UseClaimWithdrawalResult = {
  claim: (tx: MergedTransaction) => void
  isClaiming: boolean
}

export function useClaimWithdrawal(): UseClaimWithdrawalResult {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const { l1 } = useNetworksAndSigners()
  const { signer: l1Signer } = l1

  const [isClaiming, setIsClaiming] = useState(false)

  async function claim(tx: MergedTransaction) {
    if (isClaiming) {
      return
    }

    if (tx.uniqueId === null) {
      return alert("Can't find withdrawal")
    }

    let res, err

    setIsClaiming(true)

    try {
      if (tx.asset === 'eth') {
        res = await arbTokenBridge.eth.triggerOutbox({
          id: tx.uniqueId.toString(),
          l1Signer
        })
      } else {
        res = await arbTokenBridge.token.triggerOutbox({
          id: tx.uniqueId.toString(),
          l1Signer
        })
      }
    } catch (error: any) {
      err = error
      Sentry.captureException(err)
    } finally {
      setIsClaiming(false)
    }

    // Don't show any alert in case user denies the signature
    if (isUserRejectedError(err)) {
      return
    }

    if (!res) {
      alert("Can't claim this withdrawal yet")
    }
  }

  return { claim, isClaiming }
}
