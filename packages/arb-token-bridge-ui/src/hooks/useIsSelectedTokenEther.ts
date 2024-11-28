import { isExperimentalFeatureEnabled } from '../util'
import { useArbQueryParams } from './useArbQueryParams'
import { useNativeCurrency } from './useNativeCurrency'
import { useNetworks } from './useNetworks'
import { useNetworksRelationship } from './useNetworksRelationship'
import { useSelectedToken } from './useSelectedToken'

export const useIsSelectedTokenEther = () => {
  const [selectedToken] = useSelectedToken()
  const [{ token }] = useArbQueryParams()
  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  // This only matters for ETH transfers to custom orbit chains
  // So it's fine to hide this behind the feature flag
  if (!isExperimentalFeatureEnabled('eth-custom-orbit')) {
    return false
  }

  if (token === 'eth') {
    return true
  }

  if (selectedToken) {
    return false
  }

  return !nativeCurrency.isCustom
}
