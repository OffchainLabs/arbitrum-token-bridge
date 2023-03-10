/*
  A small info banner that we show when the user has some pending claim withdrawals OR some retryables to redeem.
  Format: "You have [X] deposits to retry and [Y] withdrawals ready to claim. [CTA]" 
*/

import { InformationCircleIcon } from '@heroicons/react/outline'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import {
  isDepositReadyToRedeem,
  isWithdrawalReadyToClaim
} from '../../state/app/utils'
import { isFathomNetworkName, trackEvent } from '../../util/AnalyticsUtils'
import { getNetworkName } from '../../util/networks'
import { useAppContextDispatch } from '../App/AppContext'
import { ExternalLink } from '../common/ExternalLink'

export const TransactionStatusInfo = ({
  deposits
}: {
  deposits: MergedTransaction[]
}) => {
  const {
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const l2NetworkName = getNetworkName(l2Network.chainID)
  const dispatch = useAppContextDispatch()

  // get the pending withdrawals to claim
  const {
    app: { mergedTransactions }
  } = useAppState()
  const numWithdrawalsReadyToClaim = mergedTransactions.filter(tx =>
    isWithdrawalReadyToClaim(tx)
  ).length

  // get the pending retryables to redeem
  const numRetryablesToRedeem = deposits.filter(tx =>
    isDepositReadyToRedeem(tx)
  ).length

  // don't show this banner if user doesn't have anything to claim or redeem
  if (numWithdrawalsReadyToClaim === 0 && numRetryablesToRedeem === 0)
    return null

  return (
    <div className="flex items-center gap-1 rounded-md bg-orange p-2 text-base text-brick-dark lg:flex-nowrap">
      <div className="flex flex-wrap items-center gap-1">
        <InformationCircleIcon className="h-4 w-4" />
        You have
        {/* deposits ready to retry */}
        {numRetryablesToRedeem ? (
          <span className="font-bold">
            {`${numRetryablesToRedeem} ${
              numRetryablesToRedeem > 1 ? 'deposits' : 'deposit'
            } to retry`}
          </span>
        ) : null}
        {/* and */}
        {numRetryablesToRedeem && numWithdrawalsReadyToClaim ? (
          <span>and</span>
        ) : null}
        {/* withdrawals ready to claim text */}
        {numWithdrawalsReadyToClaim ? (
          <span className="font-bold">
            {`${numWithdrawalsReadyToClaim} ${
              numWithdrawalsReadyToClaim > 1 ? 'withdrawals' : 'withdrawal'
            } ready to claim`}
          </span>
        ) : null}
        <span>.</span>
      </div>

      {/* open tx history panel cta */}
      <ExternalLink
        className="arb-hover cursor-pointer text-sm text-blue-link underline"
        onClick={() => {
          dispatch({
            type: 'layout.set_txhistory_panel_visible',
            payload: true
          })
          if (isFathomNetworkName(l2NetworkName)) {
            trackEvent(`Open Transaction History Click: Tx Info Banner`)
          }
        }}
      >
        Open Transaction History panel.
      </ExternalLink>
    </div>
  )
}
