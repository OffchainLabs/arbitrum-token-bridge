import { isNetwork } from '../util/networks'

export function isDepositMode({
  sourceChainId,
  destinationChainId
}: {
  sourceChainId: number
  destinationChainId: number
}) {
  const {
    isEthereumMainnetOrTestnet: isSourceChainEthereum,
    isArbitrum: isSourceChainArbitrum
  } = isNetwork(sourceChainId)
  const { isOrbitChain: isDestinationChainOrbit } =
    isNetwork(destinationChainId)

  const isDepositMode =
    isSourceChainEthereum || (isSourceChainArbitrum && isDestinationChainOrbit)

  return isDepositMode
}
