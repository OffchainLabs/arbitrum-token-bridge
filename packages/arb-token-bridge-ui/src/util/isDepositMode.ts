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
    isEthereumMainnetOrTestnet: isDestinationChainEthereumMainnetOrTestnet
  } = isNetwork(destinationChainId)

  const validDestinationChains = getDestinationChainIds(sourceChainId)

  if (!validDestinationChains.includes(destinationChainId)) {
    throw new Error('Unsupported source and destination chain pair.')
  }

  if (isDestinationChainEthereumMainnetOrTestnet) {
    return false
  }

  const destinationChain = getArbitrumNetwork(destinationChainId)
  return destinationChain.parentChainId === sourceChainId
}
