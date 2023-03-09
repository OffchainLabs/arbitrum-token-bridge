/*
  A small info banner that we show when the user has some pending claims.
  Format: "You have [X] withdrawals ready to claim. [CTA]" 
*/

import { CheckCircleIcon } from '@heroicons/react/outline'
import { OutgoingMessageState } from 'token-bridge-sdk'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useAppState } from '../../state'
import { isPending, outgoungStateToString } from '../../state/app/utils'
import { isFathomNetworkName, trackEvent } from '../../util/AnalyticsUtils'
import { getNetworkName } from '../../util/networks'
import { useAppContextDispatch } from '../App/AppContext'
import { ExternalLink } from '../common/ExternalLink'

export const PendingClaimsInfo = () => {
  const {
    l2: { network: l2Network }
  } = useNetworksAndSigners()

  const {
    app: { mergedTransactions }
  } = useAppState()

  const l2NetworkName = getNetworkName(l2Network.chainID)

  const dispatch = useAppContextDispatch()

  const numPendingClaimTransactions = mergedTransactions.filter(
    tx =>
      isPending(tx) &&
      tx.status === outgoungStateToString[OutgoingMessageState.CONFIRMED]
  ).length

  // don't show this if user doesn't have anything to claim
  if (!numPendingClaimTransactions) return null

  return (
    <div className="flex items-center gap-1 rounded-md bg-lime p-2 text-base text-lime-dark lg:flex-nowrap">
      <CheckCircleIcon className="h-4 w-4" />
      You have
      <span className="font-bold">{numPendingClaimTransactions}</span>
      {`${numPendingClaimTransactions > 1 ? 'withdrawals' : 'withdrawal'}`}{' '}
      <span className="font-bold">ready to claim.</span>
      <ExternalLink
        className="arb-hover cursor-pointer text-sm text-blue-link underline"
        onClick={() => {
          dispatch({
            type: 'layout.set_txhistory_panel_visible',
            payload: true
          })
          if (isFathomNetworkName(l2NetworkName)) {
            trackEvent(
              `Open Transaction History Click: Withdrawals Ready Banner`
            )
          }
        }}
      >
        Open Transaction History panel.
      </ExternalLink>
    </div>
  )
}
