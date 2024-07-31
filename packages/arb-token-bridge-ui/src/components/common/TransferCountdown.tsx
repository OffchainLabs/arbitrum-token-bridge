import { isTeleport } from '@/token-bridge-sdk/teleport'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import {
  getOrbitDepositDuration,
  minutesToHumanReadableTime,
  useTransferDuration
} from '../../hooks/useTransferDuration'
import { isNetwork } from '../../util/networks'

/**
 * Displays a transfer countdown for a deposit, withdrawal, or cctp.
 *
 * @param {MergedTransaction} tx - The transaction object.
 * @param {boolean} firstLegOnly - Teleport has 2 txns, this flag will give us estimate of only 1st tx, else it will give consolidated duration.
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

  const _isTeleport = isTeleport({
    sourceChainId: tx.sourceChainId,
    destinationChainId: tx.destinationChainId
  })

  // To get the first retryable only, we subtract the Orbit deposit time (second retryable)
  if (_isTeleport && firstLegOnly) {
    estimatedMinutesLeft -= getOrbitDepositDuration(isTestnet)
  }

  if (!tx.isWithdrawal && !tx.isCctp && !_isTeleport) {
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
      {minutesToHumanReadableTime(estimatedMinutesLeft)} {textAfterTime}
    </span>
  )
}
