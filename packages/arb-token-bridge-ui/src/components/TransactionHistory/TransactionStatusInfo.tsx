/*
  A small info banner that we show when the user has some pending claim withdrawals OR some retryables to redeem.
  Format: "You have [X] deposits to retry and [Y] withdrawals ready to claim. [CTA]"
*/

import { useAccount } from 'wagmi'
import { useMemo } from 'react'
import {
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { twMerge } from 'tailwind-merge'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

import {
  isDepositReadyToRedeem,
  isWithdrawalReadyToClaim
} from '../../state/app/utils'
import { shouldTrackAnalytics, trackEvent } from '../../util/AnalyticsUtils'
import { getNetworkName } from '../../util/networks'
import { useAppContextActions } from '../App/AppContext'
import { ExternalLink } from '../common/ExternalLink'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'

export const TransactionStatusInfo = () => {
  const { address } = useAccount()
  const {
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const l2NetworkName = getNetworkName(l2Network.id)
  const { openTransactionHistoryPanel } = useAppContextActions()
  const { transactions } = useTransactionHistory(address)

  const { numWithdrawalsReadyToClaim, numRetryablesToRedeem } = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        // standard bridge withdrawal
        if (isWithdrawalReadyToClaim(tx)) {
          acc.numWithdrawalsReadyToClaim += 1
        }
        // failed retryable
        if (isDepositReadyToRedeem(tx)) {
          acc.numRetryablesToRedeem += 1
        }
        return acc
      },
      { numWithdrawalsReadyToClaim: 0, numRetryablesToRedeem: 0 }
    )
  }, [transactions])

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
        openTransactionHistoryPanel()
        if (shouldTrackAnalytics(l2NetworkName)) {
          trackEvent('Open Transaction History Click', {
            pageElement: 'Tx Info Banner'
          })
        }
      }}
    >
      <div className="flex items-start gap-2">
        {numRetryablesToRedeem ? (
          <InformationCircleIcon className="mt-1 h-4 w-4" />
        ) : (
          <CheckCircleIcon className="mt-1 h-4 w-4" />
        )}
        <p>
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
        </p>
      </div>
    </div>
  )
}
