import dayjs, { Dayjs } from 'dayjs'

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
  withdrawalFromChainId
}: {
  createdAt: Dayjs
  withdrawalFromChainId: number
}) {
  const baseChainId = getBaseChainIdByChainId({
    chainId: withdrawalFromChainId
  })
  // the block time is always base chain's block time regardless of withdrawing from L3 to L2 or from L2 to L1
  // and similarly, the confirm period blocks is always the number of blocks on the base chain
  const confirmationSeconds =
    getBlockTime(baseChainId) * getConfirmPeriodBlocks(withdrawalFromChainId) +
    CONFIRMATION_BUFFER_MINUTES * SECONDS_IN_MIN
  return createdAt.add(confirmationSeconds, 'second')
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
    withdrawalFromChainId: tx.childChainId
  })

  const minutesLeft = Math.max(txConfirmationDate.diff(dayjs(), 'minute'), 0)

  const timeLeftText =
    minutesLeft === 0 ? 'less than a minute' : txConfirmationDate.fromNow(true)

  return <span>{timeLeftText}</span>
}
