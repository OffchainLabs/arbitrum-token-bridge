import dayjs, { Dayjs } from 'dayjs'
import { ChainId } from '../util/networks'

/**
 * Buffer for after a node is confirmable but isn't yet confirmed; we give 30 minutes, should usually/always be less in practice.
 */
const CONFIRMATION_BUFFER_MINUTES = 30

export function getTxConfirmationDate({
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

export function getTxConfirmationRemainingMinutes({
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

  if (parentChainId === ChainId.Mainnet) {
    return SEVEN_DAYS_IN_MINUTES
  }

  // Node is created every ~1h for all other chains
  return 60
}
