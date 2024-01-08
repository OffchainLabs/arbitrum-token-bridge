import dayjs, { Dayjs } from 'dayjs'

import { ChainId } from '../../util/networks'
import { MergedTransaction } from '../../state/app/state'

/**
 * Buffer for after a node is confirmable but isn't yet confirmed; we give 30 minutes, should usually/always be less in practice.
 */
const CONFIRMATION_BUFFER_MINUTES = 30

function getTxConfirmationDate({
  createdAt,
  parentChainId
}: {
  createdAt: Dayjs
  parentChainId: number
}) {
  const confirmNodeMinutes = getNodeConfirmationTimeInMinutes(parentChainId)

  return createdAt
    .add(confirmNodeMinutes, 'minute')
    .add(CONFIRMATION_BUFFER_MINUTES, 'minute')
}

function getTxConfirmationRemainingMinutes({
  createdAt,
  parentChainId
}: {
  createdAt: Dayjs
  parentChainId: number
}) {
  const txConfirmationDate = getTxConfirmationDate({ createdAt, parentChainId })
  return Math.max(txConfirmationDate.diff(dayjs(), 'minute'), 0)
}

function getNodeConfirmationTimeInMinutes(parentChainId: ChainId) {
  const SEVEN_DAYS_IN_MINUTES = 7 * 24 * 60

  if (parentChainId === ChainId.Ethereum) {
    return SEVEN_DAYS_IN_MINUTES
  }

  // Node is created every ~1h for all other chains
  return 60
}

export function WithdrawalCountdown({
  tx
}: {
  tx: MergedTransaction
}): JSX.Element | null {
  // For new txs createdAt won't be defined yet, we default to the current time in that case
  const createdAtDate = tx.createdAt ? dayjs(tx.createdAt) : dayjs()
  const txConfirmationDate = getTxConfirmationDate({
    createdAt: createdAtDate,
    parentChainId: tx.parentChainId
  })

  const minutesLeft = getTxConfirmationRemainingMinutes({
    createdAt: createdAtDate,
    parentChainId: tx.parentChainId
  })

  const timeLeftText =
    minutesLeft === 0
      ? 'less than a minute'
      : dayjs().to(txConfirmationDate, true)

  return <span>{timeLeftText}</span>
}
