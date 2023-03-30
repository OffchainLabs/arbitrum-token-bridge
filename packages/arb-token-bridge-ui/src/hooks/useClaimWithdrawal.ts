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
  const {
    l1: { signer: l1Signer, provider: l1Provider }
  } = useNetworksAndSigners()

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
          l1Signer,
          l1Provider
        })
      } else {
        res = await arbTokenBridge.token.triggerOutbox({
          id: tx.uniqueId.toString(),
          l1Signer,
          l1Provider
        })
      }
    } catch (error: any) {
      err = error
    } finally {
      setIsClaiming(false)
    }

    // Don't show any alert / log any error in case user denies the signature
    if (isUserRejectedError(err)) {
      return
    }

    Sentry.captureException(err)
    if (!res) {
      alert(`Cannot claim withdrawal: ${err?.message ?? err}`)
    }
  }

  return { claim, isClaiming }
}
