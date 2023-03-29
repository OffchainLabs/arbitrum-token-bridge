import { useState } from 'react'
import * as Sentry from '@sentry/react'
import { useAppState } from '../state'
import { MergedTransaction } from '../state/app/state'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import {
  getOutgoingMessageStateFromTxHash,
  OutgoingMessageState
} from 'token-bridge-sdk'

export type UseClaimWithdrawalResult = {
  claim: (tx: MergedTransaction) => void
  isClaiming: boolean
}

export function useClaimWithdrawal(): UseClaimWithdrawalResult {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const {
    l1: { signer: l1Signer, provider: l1Provider },
    l2: {
      provider: l2Provider,
      network: { chainID: l2ChainID }
    }
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
      // check if the withdrawal is definitely ready to be claimed
      const outgoingMessageState = await getOutgoingMessageStateFromTxHash({
        txHash: tx.txId,
        l2Provider,
        l1Provider,
        l2ChainID
      })
      if (typeof outgoingMessageState === 'undefined') {
        // cannot find the outgoing message state because no L2ToL1Events were found for this tx-id
        throw new Error('Claim withdrawal error: No withdrawal events found')
      } else if (outgoingMessageState === OutgoingMessageState.EXECUTED) {
        // update the row with the correct status as well and hide the claim button
        // show an alert - withdrawal has already been claimed, please check your L1 balance
        throw new Error(
          'Claim withdrawal error: Withdrawal has already been claimed, please check your L1 balance'
        )
      } else if (outgoingMessageState === OutgoingMessageState.UNCONFIRMED) {
        // Can't claim this withdrawal yet
        throw new Error(
          "Claim withdrawal error: Can't claim this withdrawal yet"
        )
      }

      // if no error found yet, then we can proceed with the withdrawal
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
      Sentry.captureException(error)
    } finally {
      setIsClaiming(false)
    }

    // Don't show any alert in case user denies the signature
    if (isUserRejectedError(err)) {
      return
    }

    // if the error was found, then show it to the user
    if (err) alert(err)
  }

  return { claim, isClaiming }
}
