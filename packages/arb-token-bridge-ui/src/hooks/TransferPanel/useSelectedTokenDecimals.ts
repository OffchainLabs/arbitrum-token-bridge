import { useNativeCurrency } from '../useNativeCurrency'
import { useNetworksRelationship } from '../useNetworksRelationship'
import { useNetworks } from '../useNetworks'
import { useSelectedToken } from '../useSelectedToken'

export function useSelectedTokenDecimals() {
  const { selectedToken } = useSelectedToken()
  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  return selectedToken ? selectedToken.decimals : nativeCurrency.decimals
}
