import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'
import { allowedSourceTokens } from '../../../pages/api/crosschain-transfers/lifi'
import { isNetwork } from '../../../util/networks'
import { isDepositMode as isDepositModeUtil } from '../../../util/isDepositMode'
import { isValidTeleportChainPair } from '@/token-bridge-sdk/teleport'

/**
 * Lifi transfers are allowed for {@link} allowedSourceTokens from ArbitrumOne to Mainnet
 */
export const isLifiTransferAllowed = function ({
  selectedToken,
  sourceChainId,
  destinationChainId
}: {
  selectedToken: ERC20BridgeToken | null
  sourceChainId: number
  destinationChainId: number
}) {
  const isDepositMode = isDepositModeUtil({
    sourceChainId: sourceChainId,
    destinationChainId: destinationChainId
  })
  const isTeleportMode = isValidTeleportChainPair({
    sourceChainId: sourceChainId,
    destinationChainId: destinationChainId
  })

  if (isTeleportMode) {
    return false
  }

  if (isDepositMode) {
    return false
  }

  if (
    !isNetwork(sourceChainId).isArbitrumOne ||
    !isNetwork(destinationChainId).isEthereumMainnet
  ) {
    return false
  }

  if (selectedToken && !allowedSourceTokens.includes(selectedToken.address)) {
    return false
  }

  return true
}
