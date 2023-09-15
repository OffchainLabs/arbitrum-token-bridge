import { useMedia } from 'react-use'
import dayjs, { Dayjs } from 'dayjs'

import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { ChainId } from '../../util/networks'

/**
 * Buffer for after a node is confirmable but isn't yet confirmed; we give 30 minutes, should be usually/always be less in practice.
 */
const CONFIRMATION_BUFFER_MINUTES = 30

function getTxRemainingMinutes({
  createdAt,
  parentChainId
}: {
  createdAt: string | Dayjs
  parentChainId: number
}) {
  if (typeof createdAt === 'string') {
    createdAt = dayjs(createdAt)
  }
  if (!createdAt.isValid()) {
    return -1
  }

  const confirmNodeMinutes = chainIdToConfirmNodeMinutes(parentChainId)

  return Math.max(
    createdAt
      .add(confirmNodeMinutes, 'minute')
      .add(CONFIRMATION_BUFFER_MINUTES, 'minute')
      .diff(dayjs(), 'minute'),
    0
  )
}

function chainIdToConfirmNodeMinutes(parentChainId: ChainId) {
  const SEVEN_DAYS_IN_MINUTES = 7 * 24 * 60

  if (parentChainId === ChainId.Mainnet) {
    return SEVEN_DAYS_IN_MINUTES
  }

  // Node is created every ~1h for all other chains
  return 60
}

export function WithdrawalCountdown({
  createdAt
}: {
  createdAt: string | null
}): JSX.Element {
  const {
    l1: { network: l1Network }
  } = useNetworksAndSigners()
  const isLargeScreen = useMedia('(min-width: 1024px)')
  const remainingTextOrEmpty = isLargeScreen ? ' remaining' : ''

  // For new txs createAt won't be defined yet, we default to the current time in that case
  const createdAtDate = createdAt ? dayjs(createdAt) : dayjs()

  const minutesLeft = getTxRemainingMinutes({
    createdAt: createdAtDate,
    parentChainId: l1Network.id
  })
  const hoursLeft = Math.floor(minutesLeft / 60)
  const daysLeft = Math.floor(hoursLeft / 24)

  let timeLeftText

  if (minutesLeft === -1) {
    // There was a date error, e.g. invalid local storage
    timeLeftText = `Estimation failed`
  } else if (daysLeft > 0) {
    timeLeftText = `~${daysLeft} day${
      daysLeft === 1 ? '' : 's'
    }${remainingTextOrEmpty}`
  } else if (hoursLeft > 0) {
    timeLeftText = `~${hoursLeft} hour${
      hoursLeft === 1 ? '' : 's'
    }${remainingTextOrEmpty}`
  } else if (minutesLeft > 0) {
    timeLeftText = `~${minutesLeft} minute${
      minutesLeft === 1 ? '' : 's'
    }${remainingTextOrEmpty}`
  } else {
    timeLeftText = 'Almost there...'
  }

  return <span>{timeLeftText}</span>
}
