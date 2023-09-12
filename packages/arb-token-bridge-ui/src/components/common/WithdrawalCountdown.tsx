import dayjs from 'dayjs'
import { useBlockNumber } from 'wagmi'

import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getBlockTime, getConfirmPeriodBlocks } from '../../util/networks'
import {
  NodeBlockDeadlineStatus,
  NodeBlockDeadlineStatusTypes
} from '../../hooks/arbTokenBridge.types'
import { Tooltip } from './Tooltip'

// Buffer for after a node is confirmable but isn't yet confirmed; we give ~30 minutes, should be usually/always be less in practice
export const CONFIRMATION_BUFFER_BLOCKS = 120

export function WithdrawalCountdown({
  nodeBlockDeadline
}: {
  nodeBlockDeadline: NodeBlockDeadlineStatus
}): JSX.Element {
  const {
    l1: { network: l1Network },
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const { data: currentL1BlockNumber = 0 } = useBlockNumber({
    chainId: l1Network.id,
    watch: true
  })

  if (
    typeof nodeBlockDeadline === 'undefined' ||
    typeof l2Network === 'undefined'
  ) {
    return <span>Calculating...</span>
  }

  const blockTime = getBlockTime(l1Network.id) ?? 15
  const confirmPeriodBlocks = getConfirmPeriodBlocks(l2Network.id)

  if (nodeBlockDeadline === NodeBlockDeadlineStatusTypes.NODE_NOT_CREATED) {
    const withdrawalTimeInSeconds = confirmPeriodBlocks * blockTime
    const withdrawalDate = dayjs().add(withdrawalTimeInSeconds, 'second')
    const remainingTime = dayjs().to(withdrawalDate, true)

    return (
      <span className="animate-pulse whitespace-nowrap">
        ~{remainingTime} remaining
      </span>
    )
  }

  if (nodeBlockDeadline === NodeBlockDeadlineStatusTypes.NODE_NOT_CREATED) {
    return <span>Failure</span>
  }

  const blocksRemaining = Math.max(
    nodeBlockDeadline + CONFIRMATION_BUFFER_BLOCKS - currentL1BlockNumber,
    0
  )

  const minutesLeft = Math.round((blocksRemaining * blockTime) / 60)
  const hoursLeft = Math.round(minutesLeft / 60)
  const daysLeft = Math.round(hoursLeft / 24)

  if (daysLeft > 0) {
    return (
      <Tooltip
        content={<span> {`~${blocksRemaining} blocks remaining`} </span>}
      >
        <span className="animate-pulse whitespace-nowrap">
          {`~${daysLeft} day${daysLeft === 1 ? '' : 's'}`} remaining
        </span>
      </Tooltip>
    )
  }

  if (hoursLeft > 0) {
    return (
      <Tooltip
        content={<span> {`~${blocksRemaining} blocks remaining`} </span>}
      >
        <span className="animate-pulse whitespace-nowrap">
          {`~${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}`} remaining
        </span>
      </Tooltip>
    )
  }

  if (minutesLeft === 0) {
    return (
      <span className="animate-pulse whitespace-nowrap">About an hour</span>
    )
  }

  return (
    <Tooltip content={<span> {`~${blocksRemaining} blocks remaining`} </span>}>
      <span className="animate-pulse whitespace-nowrap">
        {`~${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}`} remaining
      </span>
    </Tooltip>
  )
}
