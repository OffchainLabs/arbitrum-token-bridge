import {
  getOrbitDepositDuration,
  minutesToHumanReadableTime,
  useTransferDuration
} from '../../hooks/useTransferDuration'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { isTeleportTx } from '../../types/Transactions'
import { isNetwork } from '../../util/networks'

/**
 * Displays a transfer countdown for a deposit, withdrawal, or cctp.
 *
 * @param {MergedTransaction} tx - The transaction object.
 * @param {boolean} firstLegOnly - Teleport has 2 txns, this flag will give us estimate of only 1st tx, else it will give consolidated duration.
 * @param {string} textAfterTime - Text to be displayed after the remaining time, e.g. if this was "remaining", it would result with e.g. "15 minutes remaining".
 */
export function TransferCountdown({
  tx,
  firstLegOnly,
  textAfterTime = ''
}: {
  tx: MergedTransaction
  firstLegOnly?: boolean
  textAfterTime?: string
}) {
  const { isTestnet } = isNetwork(tx.sourceChainId)
  let { estimatedMinutesLeft } = useTransferDuration(tx)

  if (estimatedMinutesLeft === null) {
    return <span>Calculating...</span>
  }

  const isTeleport = isTeleportTx(tx)
  // To get the first retryable only, we subtract the Orbit deposit time (second retryable)
  if (isTeleport && firstLegOnly) {
    estimatedMinutesLeft -= getOrbitDepositDuration(isTestnet)
  }

  const isStandardDeposit =
    !tx.isWithdrawal && !tx.isCctp && !isTeleport && !tx.isOft

  if (isStandardDeposit) {
    const depositStatus = tx.depositStatus

    // Only show when status is Pending
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
      {minutesToHumanReadableTime(estimatedMinutesLeft)} {textAfterTime}
    </span>
  )
}
