/*
  A small info banner that we show when the user has some pending claim withdrawals OR some retryables to redeem.
  Format: "You have [X] deposits to retry and [Y] withdrawals ready to claim. [CTA]"
*/

import {
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import {
  isDepositReadyToRedeem,
  isWithdrawalReadyToClaim
} from '../../state/app/utils'
import { shouldTrackAnalytics, trackEvent } from '../../util/AnalyticsUtils'
import { getNetworkName } from '../../util/networks'
import { TransactionHistoryTab, useAppContextActions } from '../App/AppContext'
import { ExternalLink } from '../common/ExternalLink'

export const TransactionStatusInfo = ({
  deposits
}: {
  deposits: MergedTransaction[]
}) => {
  const [networks] = useNetworks()
  const { childChain } = useNetworksRelationship(networks)
  const l2NetworkName = getNetworkName(childChain.id)
  const { openTransactionHistoryPanel, setTransactionHistoryTab } =
    useAppContextActions()

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
    <div
      className={twMerge(
        'mx-0 flex cursor-pointer flex-wrap items-center gap-1  p-2 text-sm lg:flex-nowrap lg:rounded-md lg:text-base',
        numRetryablesToRedeem
          ? 'bg-brick text-brick-dark'
          : 'bg-lime text-lime-dark'
      )}
      onClick={() => {
        setTransactionHistoryTab(TransactionHistoryTab.DEPOSITS)
        openTransactionHistoryPanel()
        if (shouldTrackAnalytics(l2NetworkName)) {
          trackEvent('Open Transaction History Click', {
            pageElement: 'Tx Info Banner'
          })
        }
      }}
    >
      <div className="inline">
        {numRetryablesToRedeem ? (
          <InformationCircleIcon className="-mt-1 mr-2 inline h-4 w-4" />
        ) : (
          <CheckCircleIcon className="-mt-1 mr-2 inline h-4 w-4" />
        )}
        You have{` `}
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
          <span>
            {` `}and{` `}
          </span>
        ) : null}
        {/* withdrawals ready to claim text */}
        {numWithdrawalsReadyToClaim ? (
          <span className="font-bold">
            {`${numWithdrawalsReadyToClaim} ${
              numWithdrawalsReadyToClaim > 1 ? 'withdrawals' : 'withdrawal'
            } ready to claim`}
          </span>
        ) : null}
        <span>.{` `}</span>
        {/* open tx history panel cta */}
        <ExternalLink className="arb-hover text-sm underline lg:text-base">
          Open Transaction History panel.
        </ExternalLink>
      </div>
    </div>
  )
}
