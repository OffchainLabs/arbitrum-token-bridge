import { getDestinationChainIds, isNetwork } from '../util/networks'
import { getArbitrumNetwork } from '@arbitrum/sdk'

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
    isEthereumMainnetOrTestnet: isDestinationChainEthereumMainnetOrTestnet,
    isArbitrum: isDestinationChainArbitrum,
    isOrbitChain: isDestinationChainOrbit
  } = isNetwork(destinationChainId)

  const validDestinationChains = getDestinationChainIds(sourceChainId)

  if (!validDestinationChains.includes(destinationChainId)) {
    throw new Error('Unsupported source and destination chain pair.')
  }

  if (isDestinationChainEthereumMainnetOrTestnet) {
    return false
  }

  const destinationChain = getArbitrumNetwork(destinationChainId)

  if (isSourceChainEthereumMainnetOrTestnet && isDestinationChainArbitrum) {
    return true
  }

  if (
    isSourceChainEthereumMainnetOrTestnet &&
    isDestinationChainOrbit &&
    destinationChain.parentChainId === sourceChainId
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
