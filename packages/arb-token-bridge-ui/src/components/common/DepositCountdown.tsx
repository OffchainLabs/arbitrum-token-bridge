import dayjs from 'dayjs'

import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { isNetwork } from '../../util/networks'
import { isTeleport } from '@/token-bridge-sdk/teleport'

function getMinutesRemainingText(minutesRemaining: number): string {
  if (minutesRemaining <= 1) {
    return 'Less than a minute'
  }

  return `${minutesRemaining} minutes`
}

function getEstimatedDepositDurationInMinutes(
  tx: MergedTransaction,
  firstTxOnly?: boolean // teleport has 2 txns, this flag will give us estimate of only 1st tx, else it will give consolidated duration
) {
  const { parentChainId, sourceChainId, destinationChainId } = tx
  if (!parentChainId) {
    return 15
  }

  const { isEthereumMainnetOrTestnet, isTestnet } = isNetwork(parentChainId)

  if (
    isTeleport({
      sourceChainId: sourceChainId,
      destinationChainId: destinationChainId
    })
  ) {
    if (firstTxOnly) {
      return isTestnet ? 10 : 15
    }
    return isTestnet ? 11 : 20 // assuming 10 L2 + 1 Orbit, otherwise  15 L2 + 5 Orbit,
  }

  // this covers orbit chains
  if (!isEthereumMainnetOrTestnet) {
    return 1
  }

  return isTestnet ? 10 : 15
}

export function DepositCountdown({
  tx,
  firstTxOnly
}: {
  tx: MergedTransaction
  firstTxOnly?: boolean // teleport has 2 txns, this flag will give us estimate of only 1st tx, else it will give consolidated duration
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
      getEstimatedDepositDurationInMinutes(tx, firstTxOnly) -
      now.diff(whenCreated, 'minutes')
    return (
      <span className="whitespace-nowrap">
        {getMinutesRemainingText(minutesRemaining)}
      </span>
    )
  }

  return null
}
