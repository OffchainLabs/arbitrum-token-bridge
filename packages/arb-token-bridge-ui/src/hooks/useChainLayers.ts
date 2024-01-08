import { ChainId, isNetwork } from '../util/networks'
import { useNetworksAndSigners } from './useNetworksAndSigners'

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

export const useChainLayers = ({
  parentChainIdOverride,
  childChainIdOverride
}: {
  parentChainIdOverride?: ChainId
  childChainIdOverride?: ChainId
} = {}) => {
  const { l1, l2 } = useNetworksAndSigners()

  return {
    parentLayer: getChainLayerByChainId(parentChainIdOverride ?? l1.network.id),
    layer: getChainLayerByChainId(childChainIdOverride ?? l2.network.id)
  }
}
