import { getBridgeUiConfigForChain } from '../util/bridgeUiConfig'
import { getOrbitChains } from '../util/orbitChainsList'
import { useNetworks } from './useNetworks'

type DestinationChainStyle =
  | {
      borderColor: `#${string}`
      backgroundColor: string
    }
  | Record<string, never>

export const useDestinationChainStyle = (): DestinationChainStyle => {
  const [networks] = useNetworks()
  const orbitChains = getOrbitChains({ mainnet: true, testnet: false })
  const orbitChain = orbitChains.find(
    orbitChain => orbitChain.chainId === networks.destinationChain.id
  )

  // early return if the orbit chain is not found
  if (!orbitChain) return {}

  // styles for the orbit chain
  const orbitChainColor = getBridgeUiConfigForChain(orbitChain.chainId).color
  const orbitStyles = {
    borderColor: orbitChainColor,
    backgroundColor: `${orbitChainColor}40`
  }

  return orbitStyles
}
