import { DepositStatus, MergedTransaction } from '../../state/app/state'
import {
  minutesToHumanReadableTime,
  useTransferDuration
} from '../../hooks/useTransferDuration'

/**
 * Displays a transfer countdown for a deposit, withdrawal, or cctp.
 *
 * @param {MergedTransaction} tx - The transaction object.
 * @param {boolean} firstLegOnly - Teleport has 2 txns, this flag will give us estimate of only 1st tx, else it will give consolidated duration.
 */
export function TransferCountdown({
  tx,
  firstLegOnly,
  textAfterAmount = ''
}: {
  tx: MergedTransaction
  firstLegOnly?: boolean
  textAfterAmount?: string
}) {
  const { duration, firstLegDuration, remaining } = useTransferDuration(tx)

  if (remaining === null) {
    return <span>Calculating...</span>
  }

  const durationWithoutFirstLeg = duration - firstLegDuration

  const minutesRemaining = firstLegOnly
    ? Math.max(remaining - durationWithoutFirstLeg, 0)
    : remaining

  if (!tx.isWithdrawal && !tx.isCctp) {
    const depositStatus = tx.depositStatus

    if (
      !depositStatus ||
      ![DepositStatus.L1_PENDING, DepositStatus.L2_PENDING].includes(
        depositStatus
      )
    ) {
      return null
    }
  }

  return (
    <span className="whitespace-nowrap">
      {minutesToHumanReadableTime(minutesRemaining)} {textAfterAmount}
    </span>
  )
}
