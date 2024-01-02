import { useMedia } from 'react-use'
import dayjs, { Dayjs } from 'dayjs'

import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import {
  getBaseChainIdByChainId,
  getBlockTime,
  getConfirmPeriodBlocks
} from '../../util/networks'
import { MergedTransaction } from '../../state/app/state'

/**
 * Buffer for after a node is confirmable but isn't yet confirmed.
 * A rollup block (RBlock) typically gets asserted every 30-60 minutes.
 */
const CONFIRMATION_BUFFER_MINUTES = 60

const SECONDS_IN_MIN = 60

export function getTxConfirmationDate({
  createdAt,
  withdrawalFromChainId,
  baseChainId
}: {
  createdAt?: Dayjs | null
  withdrawalFromChainId: number
  baseChainId: number
}) {
  const createdAtDate = createdAt ?? dayjs()

  // the block time is always base chain's block time regardless of withdrawing from L3 to L2 or from L2 to L1
  // and similarly, the confirm period blocks is always the number of blocks on the base chain
  const confirmationSeconds =
    getBlockTime(baseChainId) * getConfirmPeriodBlocks(withdrawalFromChainId) +
    CONFIRMATION_BUFFER_MINUTES * SECONDS_IN_MIN

  return createdAtDate.add(confirmationSeconds, 'second')
}

export function WithdrawalCountdown({
  tx
}: {
  tx: MergedTransaction
}): JSX.Element | null {
  const {
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const isLargeScreen = useMedia('(min-width: 1024px)')
  const baseChainId = getBaseChainIdByChainId({
    chainId: l2Network.id
  })

  // For new txs createdAt won't be defined yet, we default to the current time in that case
  const createdAtDate = tx.createdAt ? dayjs(tx.createdAt) : dayjs()
  const txConfirmationDate = getTxConfirmationDate({
    createdAt: createdAtDate,
    withdrawalFromChainId: l2Network.id,
    baseChainId
  })

  const minutesLeft = Math.max(txConfirmationDate.diff(dayjs(), 'minute'), 0)

  const remainingTextOrEmpty =
    isLargeScreen && minutesLeft > 0 ? ' remaining' : ''

  const timeLeftText =
    minutesLeft === 0 ? 'Almost there...' : txConfirmationDate.fromNow(true)

  return <span>{timeLeftText + remainingTextOrEmpty}</span>
}
