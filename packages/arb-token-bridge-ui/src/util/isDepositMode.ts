import { isNetwork } from '../util/networks'
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

  if (isDestinationChainEthereumMainnetOrTestnet) {
    return false
  }

  const destinationChain = getArbitrumNetwork(destinationChainId)
  return destinationChain.parentChainId === sourceChainId
}
