import dayjs, { ConfigType as DayJSConfigType } from 'dayjs'

import { DepositStatus } from '../../state/app/state'

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
  createdAt,
  depositStatus
}: {
  createdAt: DayJSConfigType
  depositStatus?: DepositStatus
}): JSX.Element | null {
  const now = dayjs()
  const whenCreated = dayjs(createdAt)

  if (
    depositStatus === DepositStatus.L1_PENDING ||
    depositStatus === DepositStatus.L2_PENDING
  ) {
    // We expect the deposit to be completed within 15 minutes in most cases, so we subtract the diff from 15 minutes
    const minutesRemaining = 15 - now.diff(whenCreated, 'minutes')
    return (
      <span className="whitespace-nowrap">
        {getMinutesRemainingText(minutesRemaining)}
      </span>
    )
  }

  return null
}
