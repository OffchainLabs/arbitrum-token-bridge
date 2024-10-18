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
    isArbitrum: isSourceChainArbitrum,
    isBase: isSourceChainBase
  } = isNetwork(sourceChainId)
  const { isOrbitChain: isDestinationChainOrbit } =
    isNetwork(destinationChainId)

  const isDepositMode =
    isSourceChainEthereum ||
    isSourceChainBase ||
    (isSourceChainArbitrum && isDestinationChainOrbit)

  return isDepositMode
}
