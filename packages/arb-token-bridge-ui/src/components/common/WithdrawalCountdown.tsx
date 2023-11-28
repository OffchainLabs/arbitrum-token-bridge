import { useMedia } from 'react-use'
import dayjs, { Dayjs } from 'dayjs'

import { ChainId } from '../../util/networks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useNetworks } from '../../hooks/useNetworks'

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
  createdAt
}: {
  createdAt: string | null
}): JSX.Element {
  const [networks] = useNetworks()
  const { parentChain } = useNetworksRelationship(networks)
  const isLargeScreen = useMedia('(min-width: 1024px)')

  // For new txs createdAt won't be defined yet, we default to the current time in that case
  const createdAtDate = createdAt ? dayjs(createdAt) : dayjs()
  const txConfirmationDate = getTxConfirmationDate({
    createdAt: createdAtDate,
    parentChainId: parentChain.id
  })

  const minutesLeft = getTxConfirmationRemainingMinutes({
    createdAt: createdAtDate,
    parentChainId: parentChain.id
  })

  const remainingTextOrEmpty =
    isLargeScreen && minutesLeft > 0 ? ' remaining' : ''

  const timeLeftText =
    minutesLeft === 0 ? 'Almost there...' : dayjs().to(txConfirmationDate, true)

  return <span>{timeLeftText + remainingTextOrEmpty}</span>
}
