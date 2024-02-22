import dayjs from 'dayjs'

import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { isNetwork } from '../../util/networks'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'

function getMinutesRemainingText({
  minutesRemaining,
  unknownCompletionTime
}: {
  minutesRemaining: number
  unknownCompletionTime: boolean
}): string {
  if (minutesRemaining <= 1) {
    if (minutesRemaining <= 0) {
      return 'Almost there...'
    }

    return 'Less than a minute...'
  }

  const prefix = unknownCompletionTime ? 'up to ' : '~'

  return `${prefix}${minutesRemaining} mins remaining`
}

function getEstimatedDepositDurationInMinutes(
  childChainId: number | undefined
) {
  if (!childChainId) {
    return 15
  }

  const { isOrbitChain, isTestnet } = isNetwork(childChainId)

  if (isOrbitChain) {
    return getBridgeUiConfigForChain(childChainId).depositTimeMinutes ?? 15
  }

  // L2 chains
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
      getEstimatedDepositDurationInMinutes(tx.childChainId) -
      now.diff(whenCreated, 'minutes')

    const { isOrbitChain } = isNetwork(tx.childChainId)

    // we can't estimate how much time certain Orbit chain will take to finalize a deposit
    // if this time is not specified by us, then it is an unknown completion time and we will display it a bit differently in the UI
    const unknownCompletionTime =
      isOrbitChain &&
      typeof getBridgeUiConfigForChain(tx.childChainId).depositTimeMinutes ===
        'undefined'

    return (
      <span className="whitespace-nowrap">
        {getMinutesRemainingText({ minutesRemaining, unknownCompletionTime })}
      </span>
    )
  }

  return null
}
