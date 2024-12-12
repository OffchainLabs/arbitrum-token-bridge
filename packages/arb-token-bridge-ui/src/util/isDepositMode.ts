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
    isBase: isSourceChainBase,
    isArbitrumOne: isSourceChainArbitrumOne,
    isArbitrumNova: isSourceChainArbitrumNova
  } = isNetwork(sourceChainId)
  const {
    isOrbitChain: isDestinationChainOrbit,
    isArbitrumOne: isDestinationChainArbitrumOne,
    isArbitrumNova: isDestinationChainArbitrumNova
  } = isNetwork(destinationChainId)

  if (isSourceChainArbitrumOne && isDestinationChainArbitrumNova) {
    throw new Error('Arbitrum One to Arbitrum Nova is not supported.')
  }
  if (isSourceChainArbitrumNova && isDestinationChainArbitrumOne) {
    throw new Error('Arbitrum Nova to Arbitrum One is not supported.')
  }

  const isDepositMode =
    isSourceChainEthereum ||
    isSourceChainBase ||
    (isSourceChainArbitrum && isDestinationChainOrbit)

  return isDepositMode
}
