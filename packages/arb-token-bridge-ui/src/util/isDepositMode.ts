import { getDestinationChainIds, isNetwork } from '../util/networks'

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
  const { isOrbitChain: isDestinationChainOrbit } =
    isNetwork(destinationChainId)

  const validDestinationChains = getDestinationChainIds(sourceChainId)

  if (!validDestinationChains.includes(destinationChainId)) {
    throw new Error('Unsupported source and destination chain pair.')
  }

  const isDepositMode =
    (isSourceChainEthereumMainnetOrTestnet && !isDestinationChainOrbit) ||
    isSourceChainBase ||
    (isSourceChainArbitrum && isDestinationChainOrbit)

  return isDepositMode
}
