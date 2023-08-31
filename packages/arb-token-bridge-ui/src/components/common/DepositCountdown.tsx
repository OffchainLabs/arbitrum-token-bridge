import dayjs from 'dayjs'

import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { isNetwork } from '../../util/networks'

function getMinutesRemainingText(minutesRemaining: number): string {
  if (minutesRemaining <= 1) {
    if (minutesRemaining <= 0) {
      return 'Almost there...'
    }

    return 'Less than a minute...'
  }

  return `~${minutesRemaining} mins remaining`
}

export function DepositCountdown({
  tx
}: {
  tx: MergedTransaction
}): JSX.Element | null {
  const now = dayjs()
  const createdAt = tx.createdAt
  const depositStatus = tx.depositStatus
  const whenCreated = dayjs(createdAt)

  // check which network the tx belongs to, and on basis of that show the deposit timer
  const { parentChainId } = tx
  let timerMinutes = 15 // default to 15 mins

  if (parentChainId) {
    const { isEthereum, isTestnet } = isNetwork(parentChainId)

    if (isEthereum && isTestnet) {
      // Ethereum testnets
      timerMinutes = 10
    }

    if (!isEthereum) {
      // Any deposit not originating from L1
      timerMinutes = 1
    }
  }

  if (
    depositStatus === DepositStatus.L1_PENDING ||
    depositStatus === DepositStatus.L2_PENDING
  ) {
    // We expect the deposit to be completed within 15 minutes in most cases, so we subtract the diff from 15 minutes
    const minutesRemaining = timerMinutes - now.diff(whenCreated, 'minutes')
    return (
      <span className="whitespace-nowrap">
        {getMinutesRemainingText(minutesRemaining)}
      </span>
    )
  }

  return null
}
