import { isValidTeleportChainPair } from '../token-bridge-sdk/teleport'
import { getDestinationChainIds, isNetwork } from './networks'

/**
 * determines if the UI is in deposit mode or withdrawal mode or teleport mode
 *
 * @returns {Object} {isDepositMode, isWithdrawalMode, isTeleportMode}
 */
export function getTransferMode({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: number
  destinationChainId: number
}) {
  const {
    isEthereumMainnetOrTestnet: isSourceChainEthereumMainnetOrTestnet,
    isArbitrum: isSourceChainArbitrum,
    isBase: isSourceChainBase,
    isOrbitChain: isSourceChainOrbit
  } = isNetwork(sourceChainId)
  const {
    isOrbitChain: isDestinationChainOrbit,
    isArbitrum: isDestinationChainArbitrum,
    isBase: isDestinationChainBase,
    isEthereumMainnetOrTestnet: isDestinationChainEthereumMainnetOrTestnet
  } = isNetwork(destinationChainId)

  const validDestinationChains = getDestinationChainIds(sourceChainId)

  if (!validDestinationChains.includes(destinationChainId)) {
    throw new Error('Unsupported source and destination chain pair.')
  }

  const isDepositMode =
    (isSourceChainEthereumMainnetOrTestnet && !isDestinationChainOrbit) ||
    isSourceChainBase ||
    (isSourceChainArbitrum && isDestinationChainOrbit)

  const isWithdrawalMode =
    (isSourceChainArbitrum && isDestinationChainEthereumMainnetOrTestnet) || //  l2 arbitrum chains to l1
    (isSourceChainOrbit && isDestinationChainEthereumMainnetOrTestnet) || // l2 orbit chains to l1
    (isSourceChainOrbit && isDestinationChainArbitrum) || // l3 orbit chains to l1
    (isSourceChainOrbit && isDestinationChainBase) // l3 orbit chain to Base l2

  const isTeleportMode =
    isSourceChainEthereumMainnetOrTestnet &&
    isDestinationChainOrbit &&
    isValidTeleportChainPair({
      sourceChainId,
      destinationChainId
    })

  return {
    isDepositMode,
    isWithdrawalMode,
    isTeleportMode
  }
}
