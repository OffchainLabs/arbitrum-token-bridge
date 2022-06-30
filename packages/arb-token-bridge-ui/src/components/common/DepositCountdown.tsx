import dayjs, { ConfigType as DayJSConfigType } from 'dayjs'

import { DepositStatus } from '../../state/app/state'

function getMinutesRemainingText(minutesRemaining: number): string {
  if (minutesRemaining <= 1) {
    if (minutesRemaining <= 0) {
      return 'Almost there...'
    }

    return 'Less than a minute...'
  }

  return `~${minutesRemaining} minutes`
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
    // We expect the deposit to be completed within 10 minutes in most cases, so we subtract the diff from 10 minutes
    const minutesRemaining = 10 - now.diff(whenCreated, 'minutes')
    return <span>{getMinutesRemainingText(minutesRemaining)}</span>
  }

  return null
}
