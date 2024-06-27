import { getOrbitChains } from '../util/orbitChainsList'
import { getBridgeUiConfigForChain } from '../util/bridgeUiConfig'
import { useNetworks } from './useNetworks'

export const useDestinationOrbitChain = () => {
  const [networks] = useNetworks()
  const orbitChains = getOrbitChains({ mainnet: true, testnet: false })
  const orbitChain = orbitChains.find(
    orbitChain => orbitChain.chainID === networks.destinationChain.id
  )

  // early return if the orbit chain is not found
  if (!orbitChain) return undefined

  // styles for the orbit chain
  const orbitChainColor = getBridgeUiConfigForChain(orbitChain.chainID).color
  const orbitStyles = {
    borderColor: orbitChainColor,
    backgroundColor: `${orbitChainColor}40`
  }

  return {
    chain: orbitChain,
    styles: orbitStyles
  }
}
