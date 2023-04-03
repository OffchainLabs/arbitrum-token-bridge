/*
  A small warning banner that we show when the user has had too many failed transactions in the past few days.
  Format: "In the past [X] days, you had [Y] failed txns. Get Help."
  This way users can seek help without going to the individual ticket id
*/

import { InformationCircleIcon } from '@heroicons/react/outline'
import dayjs from 'dayjs'
import { GET_HELP_LINK } from '../../constants'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import { isFathomNetworkName, trackEvent } from '../../util/AnalyticsUtils'
import { getNetworkName } from '../../util/networks'
import { ExternalLink } from '../common/ExternalLink'

export const FailedTransactionsWarning = ({
  transactions
}: {
  transactions: MergedTransaction[]
}) => {
  const {
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const l2NetworkName = getNetworkName(l2Network.chainID)

  const numFailedTransactions = transactions?.length

  const daysPassedSinceFailure =
    dayjs().diff(
      dayjs(transactions[transactions.length - 1]?.createdAt),
      'days'
    ) || 1 // to avoid '0 days passed since' issue

  // according to the specs, we have kept 3 errors as the minimum threshold to show this bar
  // don't show this if user doesn't have less than 3 failed transactions
  if (numFailedTransactions < 3) return null

  return (
    <div className="flex items-center gap-1 rounded-md bg-orange p-2 text-base text-dark lg:flex-nowrap mx-2">
      <InformationCircleIcon className="h-4 w-4" />
      In the past {daysPassedSinceFailure}{' '}
      {daysPassedSinceFailure < 2 ? 'day' : 'days'} you had
      <span className="text-brick-dark">
        {numFailedTransactions} failed transactions.
      </span>
      <ExternalLink
        href={GET_HELP_LINK}
        className="arb-hover cursor-pointer text-sm text-blue-link underline"
        onClick={() => {
          if (isFathomNetworkName(l2NetworkName)) {
            trackEvent(`Multiple Tx Error: Get Help Click on ${l2NetworkName}`)
          }
        }}
      >
        Get Help.
      </ExternalLink>
    </div>
  )
}
