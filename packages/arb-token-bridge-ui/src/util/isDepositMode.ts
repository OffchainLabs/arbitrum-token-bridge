import { getDestinationChainIds, isNetwork } from '../util/networks'
import { isValidTeleportChainPair } from '../token-bridge-sdk/teleport'

export function isDepositMode({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: number
  destinationChainId: number
}) {
  const {
    isEthereumMainnetOrTestnet: isSourceChainEthereumMainnetOrTestnet,
    isArbitrum: isSourceChainArbitrum,
    isBase: isSourceChainBase
  } = isNetwork(sourceChainId)
  const {
    isArbitrum: isDestinationChainArbitrum,
    isOrbitChain: isDestinationChainOrbit
  } = isNetwork(destinationChainId)

  const validDestinationChains = getDestinationChainIds(sourceChainId)

  if (!validDestinationChains.includes(destinationChainId)) {
    throw new Error('Unsupported source and destination chain pair.')
  }

  const isTeleportMode = isValidTeleportChainPair({
    sourceChainId,
    destinationChainId
  })

  if (isSourceChainEthereumMainnetOrTestnet && isDestinationChainArbitrum) {
    return true
  }

  if (
    isSourceChainEthereumMainnetOrTestnet &&
    isDestinationChainOrbit &&
    !isTeleportMode
  ) {
    return true
  }

  if (isSourceChainBase) {
    return true
  }

  if (isSourceChainArbitrum && isDestinationChainOrbit) {
    return true
  }

  return false
}
