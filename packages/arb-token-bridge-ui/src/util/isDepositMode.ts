import { isNetwork } from '../util/networks'

/**
 * determines if the UI is in deposit mode or withdrawal mode
 *
 * @note this function classifies L1 -> L3 as deposit mode
 * @returns boolean
 */
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
