import { isNetwork } from '../util/networks'
import { useNetworks } from './useNetworks'
import { useNetworksRelationship } from './useNetworksRelationship'

export type ChainLayer = 'L1' | 'L2' | 'Orbit'

function getChainLayerByChainId(chainId: number): ChainLayer {
  const { isEthereumMainnetOrTestnet, isArbitrum } = isNetwork(chainId)

  if (isEthereumMainnetOrTestnet) {
    return 'L1'
  }
  if (isArbitrum) {
    return 'L2'
  }
  return 'Orbit'
}

export const useChainLayers = () => {
  const [networks] = useNetworks()
  const { parentChain, childChain } = useNetworksRelationship(networks)

  return {
    parentLayer: getChainLayerByChainId(parentChain.id),
    layer: getChainLayerByChainId(childChain.id)
  }
}
