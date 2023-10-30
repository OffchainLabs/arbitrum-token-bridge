import { isNetwork } from '../util/networks'

export function getMinutesRemainingText(minutesRemaining: number): string {
  if (minutesRemaining <= 1) {
    if (minutesRemaining <= 0) {
      return 'Almost there...'
    }

    return 'Less than a minute...'
  }

  return `~${minutesRemaining} mins remaining`
}

export function getEstimatedDepositDurationInMinutes(
  sourceChainId: number | undefined
) {
  if (!sourceChainId) {
    return 15
  }

  const { isEthereum, isTestnet } = isNetwork(sourceChainId)

  // this covers orbit chains
  if (!isEthereum) {
    return 1
  }

  return isTestnet ? 10 : 15
}
