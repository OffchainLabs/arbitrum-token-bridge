import { getArbitrumNetwork } from '@arbitrum/sdk'
import { isValidTeleportChainPair } from '../token-bridge-sdk/teleport'
import { isDepositMode } from './isDepositMode'
import { getDestinationChainIds } from './networks'

type TransferMode = 'deposit' | 'withdrawal' | 'teleport' | 'unsupported'

/**
 * determines if the UI is in deposit mode or withdrawal mode or teleport mode
 */
export function getTransferMode({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: number
  destinationChainId: number
}): TransferMode {
  // const validDestinationChains = getDestinationChainIds(sourceChainId)

  // if (!validDestinationChains.includes(destinationChainId)) {
  // }

  const isDeposit = isDepositMode({ sourceChainId, destinationChainId })

  if (isDeposit) {
    return 'deposit'
  }

  const isTeleport = isValidTeleportChainPair({
    sourceChainId,
    destinationChainId
  })

  if (isTeleport) {
    return 'teleport'
  }

  const isWithdrawal =
    getArbitrumNetwork(sourceChainId).parentChainId === destinationChainId

  if (isWithdrawal) {
    return 'withdrawal'
  }

  return 'unsupported'
}
