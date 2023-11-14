import { useState } from 'react'
import * as Sentry from '@sentry/react'
import { useSigner } from 'wagmi'

import { useAppState } from '../state'
import { MergedTransaction } from '../state/app/state'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { errorToast } from '../components/common/atoms/Toast'
import { AssetType } from './arbTokenBridge.types'

export type UseClaimWithdrawalResult = {
  claim: (tx: MergedTransaction) => Promise<void>
  isClaiming: boolean
}

export function useClaimWithdrawal(): UseClaimWithdrawalResult {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const { data: signer } = useSigner()
  const [isClaiming, setIsClaiming] = useState(false)

  async function claim(tx: MergedTransaction) {
    if (isClaiming) {
      return
    }

    if (tx.uniqueId === null) {
      return errorToast("Can't find withdrawal transaction.")
    }

    let res, err

    setIsClaiming(true)

    try {
      if (!signer) {
        throw 'Signer is undefined'
      }
      if (tx.assetType === AssetType.ETH) {
        res = await arbTokenBridge.eth.triggerOutbox({
          id: tx.uniqueId.toString(),
          l1Signer: signer
        })
      } else {
        res = await arbTokenBridge.token.triggerOutbox({
          id: tx.uniqueId.toString(),
          l1Signer: signer
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
      errorToast(`Can't claim withdrawal: ${err?.message ?? err}`)
    }
  }

  return { claim, isClaiming }
}
