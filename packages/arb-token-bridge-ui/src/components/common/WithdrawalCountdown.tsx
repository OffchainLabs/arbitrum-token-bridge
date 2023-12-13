import { useMedia } from 'react-use'
import dayjs, { Dayjs } from 'dayjs'
import {
  L2Network,
  parentChains
} from '@arbitrum/sdk/dist/lib/dataEntities/networks'

import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import {
  getBlockTime,
  getConfirmPeriodBlocks,
  isNetwork
} from '../../util/networks'

/**
 * Buffer for after a node is confirmable but isn't yet confirmed; we give 30 minutes, should usually/always be less in practice.
 */
const CONFIRMATION_BUFFER_MINUTES = 30

function getTxConfirmationDate({
  createdAt,
  withdrawalFromChainId,
  baseChainId
}: {
  createdAt: Dayjs
  withdrawalFromChainId: number
  baseChainId: number
}) {
  const { confirmationMins } = getTxConfirmationTime({
    withdrawalFromChainId,
    baseChainId
  })

  return createdAt.add(confirmationMins, 'minute')
}

function getTxConfirmationRemainingMinutes(txConfirmationDate: dayjs.Dayjs) {
  return Math.max(txConfirmationDate.diff(dayjs(), 'minute'), 0)
}

export function getTxConfirmationTime({
  baseChainId,
  withdrawalFromChainId
}: {
  baseChainId: number
  withdrawalFromChainId: number
}) {
  const SECONDS_IN_DAY = 86400
  const SECONDS_IN_HOUR = 3600
  const SECONDS_IN_MIN = 60

  const { isOrbitChain } = isNetwork(withdrawalFromChainId)

  // add arbitrary 80% buffer for Orbit chain
  const arbitraryBufferMultiple = isOrbitChain ? 1.8 : 1

  // the block time is always base chain's block time regardless of withdrawing from L3 to L2 or from L2 to L1
  // and similarly, the confirm period blocks is always the number of blocks on the base chain
  const confirmationSeconds =
    getBlockTime(baseChainId) *
      getConfirmPeriodBlocks(withdrawalFromChainId) *
      arbitraryBufferMultiple +
    CONFIRMATION_BUFFER_MINUTES * SECONDS_IN_MIN

  const confirmationDays = Math.ceil(confirmationSeconds / SECONDS_IN_DAY)
  const confirmationHours = confirmationSeconds / SECONDS_IN_HOUR
  const confirmationMins = Math.ceil(confirmationSeconds / SECONDS_IN_MIN)

  return {
    confirmationSeconds,
    confirmationMins,
    confirmationHours,
    confirmationDays
  }
}

export function WithdrawalCountdown({
  createdAt
}: {
  createdAt: string | null
}): JSX.Element {
  const {
    l1: { network: l1Network },
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const isLargeScreen = useMedia('(min-width: 1024px)')
  const { isOrbitChain } = isNetwork(l2Network.id)
  const baseChainId = isOrbitChain
    ? (parentChains[l1Network.id] as L2Network)?.partnerChainID ?? 0
    : l1Network.id

  // For new txs createdAt won't be defined yet, we default to the current time in that case
  const createdAtDate = createdAt ? dayjs(createdAt) : dayjs()
  const txConfirmationDate = getTxConfirmationDate({
    createdAt: createdAtDate,
    withdrawalFromChainId: l2Network.id,
    baseChainId
  })

  const minutesLeft = getTxConfirmationRemainingMinutes(txConfirmationDate)

  const remainingTextOrEmpty =
    isLargeScreen && minutesLeft > 0 ? ' remaining' : ''

  const timeLeftText =
    minutesLeft === 0 ? 'Almost there...' : dayjs().to(txConfirmationDate, true)

  return <span>{timeLeftText + remainingTextOrEmpty}</span>
}
