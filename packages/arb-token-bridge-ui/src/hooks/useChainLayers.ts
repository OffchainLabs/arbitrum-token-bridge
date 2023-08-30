import { isNetwork } from '../util/networks'
import { useNetworksAndSigners } from './useNetworksAndSigners'

export type ChainLayer = 'L1' | 'L2' | 'Orbit'

function getLayerTypeByChainId(chainId: number): ChainLayer {
  const { isEthereum, isArbitrum } = isNetwork(chainId)

  if (isEthereum) {
    return 'L1'
  }
  if (isArbitrum) {
    return 'L2'
  }
  return 'Orbit'
}

export const useChainLayers = () => {
  const { l1, l2 } = useNetworksAndSigners()

  return {
    parentLayer: getLayerTypeByChainId(l1.network.id),
    layer: getLayerTypeByChainId(l2.network.id)
  }
}
