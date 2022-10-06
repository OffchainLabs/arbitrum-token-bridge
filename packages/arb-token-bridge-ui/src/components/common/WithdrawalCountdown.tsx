import { NodeBlockDeadlineStatus } from 'token-bridge-sdk'

import { useAppContextState } from '../App/AppContext'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { isNetwork } from '../../util/networks'

export function WithdrawalCountdown({
  nodeBlockDeadline
}: {
  nodeBlockDeadline: NodeBlockDeadlineStatus
}): JSX.Element {
  const {
    l1: { network: l1Network },
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const { currentL1BlockNumber } = useAppContextState()

  const blockTime = l1Network?.blockTime || 15

  if (
    typeof nodeBlockDeadline === 'undefined' ||
    typeof l2Network === 'undefined'
  ) {
    return <span>Calculating...</span>
  }

  if (nodeBlockDeadline === 'NODE_NOT_CREATED') {
    const { isMainnet, isRinkeby, isGoerli } = isNetwork(l1Network)
    const remainingTime = isMainnet
      ? '1 week'
      : isRinkeby || isGoerli
      ? '4 hours'
      : '1 day'
    return <span>~{remainingTime} remaining</span>
  }

  if (nodeBlockDeadline === 'EXECUTE_CALL_EXCEPTION') {
    return <span>Failure</span>
  }

  // Buffer for after a node is confirmable but isn't yet confirmed; we give ~30 minutes, should be usually/always be less in practice
  const confirmationBufferBlocks = 120
  const blocksRemaining = Math.max(
    nodeBlockDeadline + confirmationBufferBlocks - currentL1BlockNumber,
    0
  )

  const minutesLeft = Math.round((blocksRemaining * blockTime) / 60)
  const hoursLeft = Math.round(minutesLeft / 60)
  const daysLeft = Math.round(hoursLeft / 24)

  if (daysLeft > 0) {
    return (
      <span>
        {`~${blocksRemaining} blocks (~${daysLeft} day${
          daysLeft === 1 ? '' : 's'
        })`}{' '}
        remaining
      </span>
    )
  }

  if (hoursLeft > 0) {
    return (
      <span>
        {`~${blocksRemaining} blocks (~${hoursLeft} hour${
          hoursLeft === 1 ? '' : 's'
        })`}{' '}
        remaining
      </span>
    )
  }

  if (minutesLeft === 0) {
    return <span>About an hour</span>
  }

  return (
    <span>
      {`~${blocksRemaining} blocks (~${minutesLeft} minute${
        minutesLeft === 1 ? '' : 's'
      })`}{' '}
      remaining
    </span>
  )
}
