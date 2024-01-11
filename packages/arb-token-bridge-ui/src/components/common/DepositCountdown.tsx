import dayjs from 'dayjs'

import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { isNetwork } from '../../util/networks'
import { isTeleport } from '@/token-bridge-sdk/teleport'

function getMinutesRemainingText(minutesRemaining: number): string {
  if (minutesRemaining <= 1) {
    if (minutesRemaining <= 0) {
      return 'Almost there...'
    }

    return 'Less than a minute...'
  }

  return `~${minutesRemaining} mins remaining`
}

function getEstimatedDepositDurationInMinutes(tx: MergedTransaction) {
  const { parentChainId, childChainId } = tx
  if (!parentChainId) {
    return 15
  }

  const { isEthereumMainnetOrTestnet, isTestnet } = isNetwork(parentChainId)

  if (
    isTeleport({
      sourceChainId: parentChainId,
      destinationChainId: childChainId
    })
  ) {
    return 20 // assuming 15 L2 + 5 Orbit // not sure tho
  }

  // this covers orbit chains
  if (!isEthereumMainnetOrTestnet) {
    return 1
  }

  return isTestnet ? 10 : 15
}

export function DepositCountdown({
  tx
}: {
  tx: MergedTransaction
}): JSX.Element | null {
  const now = dayjs()
  const createdAt = tx.createdAt
  const depositStatus = tx.depositStatus
  const whenCreated = dayjs(createdAt)

  if (
    depositStatus === DepositStatus.L1_PENDING ||
    depositStatus === DepositStatus.L2_PENDING
  ) {
    // Subtract the diff from the initial deposit time
    const minutesRemaining =
      getEstimatedDepositDurationInMinutes(tx) -
      now.diff(whenCreated, 'minutes')
    return (
      <span className="whitespace-nowrap">
        {getMinutesRemainingText(minutesRemaining)}
      </span>
    )
  }

  return null
}
