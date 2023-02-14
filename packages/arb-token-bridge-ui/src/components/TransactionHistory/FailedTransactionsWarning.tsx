/*
  A small warning banner that we show when the user has had too many failed transactions in the past few days.
  Format: "In the past [X] days, you had [Y] failed txns. Get Help."
  This way users can seek help without going to the individual ticket id
*/

import { InformationCircleIcon } from '@heroicons/react/outline'
import dayjs from 'dayjs'
import { GET_HELP_LINK } from '../../constants'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { isDeposit, TRANSACTIONS_DATE_FORMAT } from '../../state/app/utils'
import { isFathomNetworkName, trackEvent } from '../../util/AnalyticsUtils'
import { getNetworkName } from '../../util/networks'

export const FailedTransactionsWarning = ({
  transactions
}: {
  transactions: MergedTransaction[]
}) => {
  const {
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const l2NetworkName = getNetworkName(l2Network.chainID)

  const numFailedTransactions = transactions?.filter(
    tx =>
      (isDeposit(tx) &&
        (tx.status === 'pending' ||
          tx.depositStatus == DepositStatus.L1_FAILURE ||
          tx.depositStatus === DepositStatus.L2_FAILURE)) ||
      (!isDeposit(tx) && tx.nodeBlockDeadline == 'EXECUTE_CALL_EXCEPTION')
  )?.length

  const daysPassedSinceFailure =
    dayjs().diff(
      dayjs(
        transactions[transactions.length - 1]?.createdAt,
        TRANSACTIONS_DATE_FORMAT
      ),
      'days'
    ) || 1 // to avoid '0 days' passed issue

  const getHelpOnError = () => {
    window.open(GET_HELP_LINK, '_blank')

    // track the button click
    if (isFathomNetworkName(l2NetworkName)) {
      trackEvent(`Multiple Tx errors: Get Help clicked on ${l2NetworkName}`)
    }
  }

  // don't show this if user doesn't have failed transactions
  if (numFailedTransactions < 3) return null

  return (
    <div className="flex items-center gap-1 rounded-md bg-orange p-2 text-base text-dark lg:flex-nowrap">
      <InformationCircleIcon className="h-4 w-4" />
      In the past {daysPassedSinceFailure} days you had
      <span className="text-brick-dark">
        {numFailedTransactions} failed transactions.
      </span>
      <span
        className="cursor-pointer text-sm text-blue-link underline"
        onClick={getHelpOnError}
        onKeyDown={getHelpOnError}
        aria-label="Get Help"
        role="button"
        tabIndex={0}
      >
        Get Help.
      </span>
    </div>
  )
}
