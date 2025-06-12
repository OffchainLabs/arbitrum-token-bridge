import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { ChainId } from '../types/ChainId'
import { isNetwork } from '../util/networks'
import { useNativeCurrency } from './useNativeCurrency'
import { useNetworks } from './useNetworks'
import { useNetworksRelationship } from './useNetworksRelationship'

export const useSourceChainNativeCurrencyDecimals = () => {
  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)
  const nativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })
  const { isOrbitChain: isSourceChainOrbit } = isNetwork(
    networks.sourceChain.id
  )

  if (isSourceChainOrbit) {
    return 18
  }

  return nativeCurrency.decimals
}
