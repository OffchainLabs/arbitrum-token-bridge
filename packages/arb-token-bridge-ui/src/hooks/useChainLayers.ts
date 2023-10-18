import { isNetwork } from '../util/networks'
import { useNetworks } from './useNetworks'

export type ChainLayer = 'L1' | 'L2' | 'Orbit'

function getChainLayerByChainId(chainId: number): ChainLayer {
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
  const [{ fromProvider, toProvider }] = useNetworks()

  return {
    parentLayer: getChainLayerByChainId(fromProvider.network.chainId),
    layer: getChainLayerByChainId(toProvider.network.chainId)
  }
}
