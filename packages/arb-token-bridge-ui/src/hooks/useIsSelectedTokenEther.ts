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

  if (token === 'eth' && isExperimentalFeatureEnabled('eth-custom-orbit')) {
    return true
  }

  if (selectedToken) {
    return false
  }

  return !nativeCurrency.isCustom
}
